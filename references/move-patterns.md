# Move パターン リファレンス

## 目次
1. [SBT（Soulbound Token）実装パターン](#sbt-implementation)
2. [オブジェクト設計パターン](#object-patterns)
3. [AdminCap 権限管理](#admincap)
4. [イベント設計](#events)
5. [Coin 操作パターン](#coin-operations)
6. [テスト記述パターン](#testing)

---

## 1. SBT（Soulbound Token）実装パターン {#sbt-implementation}

SUIでSBTを作る鍵は **`store` ability を除外する**こと。

```move
/// store がないので public_transfer が使えない = 譲渡不可
public struct DonorSBT has key {
    id: UID,
    donor: address,
    total_donated: u64,
    donation_count: u64,
    tier: u8,
}

/// モジュール内の transfer::transfer のみが使える
/// カスタムロジック付き移転が必要な場合のみ用意
public fun transfer(sbt: DonorSBT, recipient: address, _: &mut TxContext) {
    // 完全にSoulboundにしたい場合はこの関数自体を作らない
    transfer::transfer(sbt, recipient)
}
```

### Dynamic Fields で履歴拡張

```move
use sui::dynamic_field;

/// 寄付履歴エントリ
public struct DonationEntry has store, drop {
    amount: u64,
    timestamp: u64,
    box_id: ID,
}

/// SBTに寄付履歴を追加
public fun add_donation_history(
    sbt: &mut DonorSBT,
    entry: DonationEntry,
    count: u64,
) {
    // キーとして寄付番号を使用
    dynamic_field::add(&mut sbt.id, count, entry);
}
```

### ティア自動計算

```move
const TIER_BRONZE: u8 = 0;
const TIER_SILVER: u8 = 1;    // 1 SUI 以上
const TIER_GOLD: u8 = 2;      // 10 SUI 以上
const TIER_PLATINUM: u8 = 3;  // 100 SUI 以上

fun calculate_tier(total: u64): u8 {
    let sui_amount = total / 1_000_000_000; // MIST to SUI
    if (sui_amount >= 100) {
        TIER_PLATINUM
    } else if (sui_amount >= 10) {
        TIER_GOLD
    } else if (sui_amount >= 1) {
        TIER_SILVER
    } else {
        TIER_BRONZE
    }
}
```

---

## 2. オブジェクト設計パターン {#object-patterns}

### Shared Object（募金箱）

```move
/// 全員がアクセスできる共有オブジェクト
public struct DonationBox has key {
    id: UID,
    total_donated: u64,
    total_donors: u64,
    npo_address: address,
    name: String,
    description: String,
    is_active: bool,
}

/// 作成時に share_object で共有化
fun init(ctx: &mut TxContext) {
    let box = DonationBox {
        id: object::new(ctx),
        total_donated: 0,
        total_donors: 0,
        npo_address: tx_context::sender(ctx),
        name: string::utf8(b"Default Box"),
        description: string::utf8(b""),
        is_active: true,
    };
    transfer::share_object(box);
}
```

### Owned Object（レシート）

```move
/// 各寄付者が所有する寄付レシート
public struct DonationReceipt has key, store {
    id: UID,
    donor: address,
    amount: u64,
    timestamp: u64,
    box_id: ID,
    npo_name: String,
}
```

---

## 3. AdminCap 権限管理 {#admincap}

```move
/// 管理者権限トークン（One-Time-Witness パターン）
public struct DONATION has drop {}

/// 管理権限
public struct AdminCap has key, store {
    id: UID,
}

fun init(witness: DONATION, ctx: &mut TxContext) {
    // AdminCap をデプロイヤーに転送
    let admin = AdminCap { id: object::new(ctx) };
    transfer::transfer(admin, tx_context::sender(ctx));
}

/// AdminCapを持つ人だけがNPOを登録可能
public entry fun register_npo(
    _admin: &AdminCap,
    registry: &mut NPORegistry,
    npo_address: address,
    name: String,
    ctx: &mut TxContext,
) {
    // NPO登録ロジック
}

/// NPOが寄付金を引き出す
public entry fun withdraw(
    box: &mut DonationBox,
    amount: u64,
    ctx: &mut TxContext,
) {
    // 呼び出し者がNPOアドレスと一致するか確認
    assert!(tx_context::sender(ctx) == box.npo_address, ENotAuthorized);
    // 引き出しロジック
}
```

---

## 4. イベント設計 {#events}

イベントはオフチェーンのインデクサーやフロントエンドで購読可能。

```move
use sui::event;

public struct DonationEvent has copy, drop {
    donor: address,
    amount: u64,
    box_id: ID,
    total_after: u64,
    sbt_tier: u8,
}

public struct WithdrawalEvent has copy, drop {
    npo: address,
    amount: u64,
    box_id: ID,
    purpose: String,
}

public struct SBTMintedEvent has copy, drop {
    donor: address,
    sbt_id: ID,
}

public struct TierUpEvent has copy, drop {
    donor: address,
    old_tier: u8,
    new_tier: u8,
    total_donated: u64,
}

// イベント発火
fun emit_donation(donor: address, amount: u64, box_id: ID, total: u64, tier: u8) {
    event::emit(DonationEvent {
        donor,
        amount,
        box_id,
        total_after: total,
        sbt_tier: tier,
    });
}
```

---

## 5. Coin 操作パターン {#coin-operations}

### 端数分割（Round-Up の核心）

```move
use sui::coin::{Self, Coin};
use sui::sui::SUI;

/// 残高を丸めて端数を返す
public fun split_remainder(
    coin: &mut Coin<SUI>,
    round_to: u64,
    ctx: &mut TxContext,
): Coin<SUI> {
    let value = coin::value(coin);
    let remainder = value % round_to;
    assert!(remainder > 0, ENoRemainder);
    coin::split(coin, remainder, ctx)
}

/// 複数のダストコインをマージしてから寄付
public entry fun sweep_and_donate(
    box: &mut DonationBox,
    coins: vector<Coin<SUI>>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let merged = vector::pop_back(&mut coins);
    while (!vector::is_empty(&coins)) {
        let c = vector::pop_back(&mut coins);
        coin::join(&mut merged, c);
    };
    vector::destroy_empty(coins);
    donate_internal(box, merged, clock, ctx);
}
```

---

## 6. テスト記述パターン {#testing}

```move
#[test_only]
module donation_box::donation_tests;

use sui::test_scenario::{Self as ts};
use sui::coin;
use sui::sui::SUI;
use donation_box::donation::{Self, DonationBox};

#[test]
fun test_round_up_donate() {
    let admin = @0xA;
    let donor = @0xB;

    let mut scenario = ts::begin(admin);

    // 1. 初期化
    ts::next_tx(&mut scenario, admin);
    {
        donation::init_for_testing(ts::ctx(&mut scenario));
    };

    // 2. 寄付
    ts::next_tx(&mut scenario, donor);
    {
        let mut box = ts::take_shared<DonationBox>(&scenario);
        let coin = coin::mint_for_testing<SUI>(1347, ts::ctx(&mut scenario));
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));

        donation::round_up_donate(
            &mut box,
            coin,
            100, // 100単位で丸める → 47が寄付される
            &clock,
            ts::ctx(&mut scenario),
        );

        // 検証: 募金箱に47が入っている
        assert!(donation::total_donated(&box) == 47, 0);

        ts::return_shared(box);
        clock::destroy_for_testing(clock);
    };

    ts::end(scenario);
}
```
