---
name: sui-donation-dapp
description: |
  SUIブロックチェーン上で「透明な募金箱」dAppを開発するためのスキル。ウォレットの端数・ダストトークンを寄付に回し、寄付証明SBT（Soulbound Token）を発行、寄付金の流れをオンチェーンで完全追跡可能にするアプリケーション。
  このスキルは以下のタスクで使用する：SUI Move スマートコントラクト設計・実装、zkLogin統合によるWeb2ライクな認証、SBT（Soulbound Token）の発行ロジック、寄付金のオンチェーン追跡・可視化、React/TypeScript フロントエンド開発（Sui dApp Kit使用）、端数丸め（Round-Up）ロジックの設計。
  「募金」「寄付」「donation」「SUI」「Move」「ブロックチェーン寄付」「透明な募金箱」「ダストトークン」「SBT」「zkLogin」「Round-Up」「端数」に関連するタスクで必ずこのスキルを参照すること。
---

# SUI 透明募金箱 dApp 開発スキル

## プロジェクト概要

「透明なブラックボックス」をコンセプトにした、SUIブロックチェーン上のキャッシュレス募金アプリ。

### コアバリュー

1. **ウォレット掃除**: 端数・ダストトークンをワンタップでスッキリ（ユーザーの直接的メリット）
2. **透明な追跡**: 寄付金の行き先がオンチェーンで丸見え（従来の募金箱との差別化）
3. **寄付証明SBT**: オンチェーン人格に「いいことしてる」が刻まれる（ソーシャルプルーフ）

### ターゲット

- **Phase 1**: クリプトネイティブ層（SUI/DEXユーザー、ダストトークン問題を抱える人）
- **Phase 2**: zkLoginで一般キャッシュレスユーザーへ拡大

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│                  Frontend (React)                │
│  Sui dApp Kit + @mysten/sui + zkLogin           │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Wallet   │ │ Donation │ │ Tracking         │ │
│  │ Cleaner  │ │ History  │ │ Dashboard        │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└──────────────────┬──────────────────────────────┘
                   │ PTB (Programmable Transaction Blocks)
┌──────────────────▼──────────────────────────────┐
│              SUI Blockchain                      │
│  ┌──────────────────────────────────────────┐   │
│  │  donation_box (Move Package)             │   │
│  │  ├── donation.move   (寄付ロジック)       │   │
│  │  ├── sbt.move        (寄付証明SBT)        │   │
│  │  ├── tracker.move    (追跡・集計)         │   │
│  │  └── admin.move      (NPO管理)           │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │  Objects                                  │   │
│  │  ├── DonationBox (shared)                 │   │
│  │  ├── DonationReceipt (per-donation)       │   │
│  │  ├── DonorSBT (soulbound, per-user)       │   │
│  │  └── NPORegistry (shared)                │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Move スマートコントラクト設計

### 参照ドキュメント
Move言語の詳細やSBTの実装パターンについては `references/move-patterns.md` を参照。

### 主要モジュール

#### 1. donation.move — 寄付コアロジック

```move
module donation_box::donation;

use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::event;

/// 寄付箱 (shared object)
public struct DonationBox has key {
    id: UID,
    total_donated: u64,
    total_donors: u64,
    npo_address: address,
    is_active: bool,
}

/// 寄付レシート (各寄付のオンチェーン記録)
public struct DonationReceipt has key, store {
    id: UID,
    donor: address,
    amount: u64,
    timestamp: u64,
    box_id: ID,
}

/// 寄付イベント
public struct DonationEvent has copy, drop {
    donor: address,
    amount: u64,
    box_id: ID,
    total_after: u64,
}

/// 端数を丸めて寄付 (Round-Up)
/// balance が 1347 なら、1300 に丸めて 47 を寄付
public entry fun round_up_donate(
    box: &mut DonationBox,
    payment: Coin<SUI>,
    round_to: u64, // 100, 1000 など
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let value = coin::value(&payment);
    let remainder = value % round_to;
    assert!(remainder > 0, ENoRemainder);

    // 端数を分割して寄付
    let donation_coin = coin::split(&mut payment, remainder, ctx);
    // 残りはユーザーに返却
    transfer::public_transfer(payment, tx_context::sender(ctx));
    // 寄付を実行
    donate_internal(box, donation_coin, clock, ctx);
}

/// 任意額を寄付
public entry fun donate(
    box: &mut DonationBox,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    donate_internal(box, payment, clock, ctx);
}
```

#### 2. sbt.move — 寄付証明SBT

```move
module donation_box::sbt;

/// Soulbound: store ability を除外して譲渡不可にする
public struct DonorSBT has key {
    id: UID,
    donor: address,
    total_donated: u64,
    donation_count: u64,
    first_donation: u64,   // timestamp
    last_donation: u64,    // timestamp
    tier: u8,              // 0=Bronze, 1=Silver, 2=Gold, 3=Platinum
}

/// SBT発行 or 更新
/// - 初回寄付時に新規発行
/// - 2回目以降は既存SBTを更新（Dynamic Fields活用）
public fun mint_or_update(
    donor: address,
    amount: u64,
    timestamp: u64,
    ctx: &mut TxContext,
) {
    // ティア計算: 累積寄付額に応じてランクアップ
    // Bronze: 0+, Silver: 1 SUI+, Gold: 10 SUI+, Platinum: 100 SUI+
}
```

**SBTのポイント:**
- `store` abilityを持たないことで `transfer::public_transfer` が使えず、譲渡不可になる
- SUIのオブジェクトモデルではDynamic Fieldsで寄付履歴を追加可能
- ティアはオンチェーンで自動計算、プロフィールとして機能

#### 3. tracker.move — 寄付金追跡

```move
module donation_box::tracker;

/// 寄付金の使途を記録 (NPO側が記録)
public struct UsageRecord has key, store {
    id: UID,
    box_id: ID,
    description: String,
    amount: u64,
    recipient: String,    // 最終的な受益者の説明
    timestamp: u64,
    proof_url: String,    // 証拠URL（レシート画像等）
}
```

---

## フロントエンド設計

### 技術スタック

| 技術 | 用途 |
|------|------|
| React + TypeScript | UIフレームワーク |
| @mysten/sui | SUI SDK |
| @mysten/dapp-kit | ウォレット接続・PTB構築 |
| @mysten/zklogin | zkLogin認証 |
| @mysten/enoki | zkLogin + Sponsored Tx 簡易化 |
| TailwindCSS | スタイリング |
| Recharts / D3 | 寄付追跡ビジュアライゼーション |

### 主要画面

1. **ホーム**: 募金箱一覧、総寄付額のリアルタイム表示
2. **ウォレット掃除**: 残高の端数を表示、丸め単位選択、ワンタップ寄付
3. **寄付履歴**: 自分の寄付一覧 + SBTバッジ表示
4. **追跡ダッシュボード**: 寄付金がどこに使われたかの可視化（地図・フロー図）
5. **NPO管理**: 寄付受領、使途報告の登録

### zkLogin統合

zkLoginを使うと、Google/Apple/Facebookアカウントだけでウォレット生成が可能。
フローの詳細は `references/zklogin-flow.md` を参照。

```typescript
// 基本フロー
// 1. OAuth認証 → JWT取得
// 2. Salt生成（ユーザーごとに一意）
// 3. Ephemeral KeyPair生成
// 4. ZK Proof取得（Mysten Labs Proving Service）
// 5. zkLogin署名でトランザクション送信
```

### Sponsored Transactions

ガス代をdApp側が負担することで、ユーザーはSUIを持っていなくても寄付可能。
Enoki SDKを使うと簡易に実装できる。

---

## 開発ワークフロー

### 1. 環境構築

```bash
# Sui CLI インストール
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui

# Move プロジェクト作成
sui move new donation_box

# フロントエンド
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install @mysten/sui @mysten/dapp-kit @mysten/zklogin
```

### 2. 開発 → テスト → デプロイ

```bash
# Move テスト
sui move test

# Testnet デプロイ
sui client publish --gas-budget 100000000

# Package ID を記録してフロントエンドに設定
```

### 3. テストネットでの動作確認

- Sui Testnet Faucet でテスト用SUI取得
- 寄付フロー全体をE2Eテスト
- SBT発行・更新の確認
- 追跡ダッシュボードのデータ表示確認

---

## ビジネスモデル

| 収益源 | 説明 |
|--------|------|
| 手数料 | 寄付額の 1-2% をプラットフォーム手数料として徴収 |
| プレミアムSBT | 特別デザインのSBTバッジ（有料） |
| NPO掲載料 | 募金箱の設置・掲載に月額料金 |
| スポンサード寄付 | 企業がマッチング寄付を行う仕組み |
| データ分析 | 匿名化した寄付傾向データの提供 |

---

## セキュリティ考慮事項

1. **スマートコントラクト監査**: デプロイ前に第三者監査を受ける
2. **権限管理**: AdminCapパターンでNPO登録・資金引き出しを制限
3. **reentrancy対策**: Moveは言語レベルでreentrancy耐性あり
4. **フロントエンド**: CSP設定、入力バリデーション、XSS対策
5. **zkLogin**: Ephemeral Keyの有効期限管理、Salt のバックアップ

---

## 参考リソース

- [Sui Documentation](https://docs.sui.io/)
- [The Move Book](https://move-book.com/)
- [Sui SBT Guide](https://docs.sui.io/guides/developer/nft/nft-soulbound)
- [zkLogin Documentation](https://docs.sui.io/concepts/cryptography/zklogin)
- [Awesome Sui](https://github.com/sui-foundation/awesome-sui)
- [Sui dApp Kit](https://sdk.mystenlabs.com/dapp-kit)
