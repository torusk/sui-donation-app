# zkLogin 統合リファレンス

## 目次
1. [zkLogin 概要](#overview)
2. [認証フロー](#auth-flow)
3. [React 実装例](#react-implementation)
4. [Enoki SDK 簡易統合](#enoki)
5. [Sponsored Transactions](#sponsored-tx)
6. [注意事項・トラブルシューティング](#caveats)

---

## 1. zkLogin 概要 {#overview}

zkLoginはSUIネイティブの認証プリミティブ。Google/Apple/Facebook等のOAuth認証情報からSUIアドレスを生成し、ゼロ知識証明でプライバシーを保護する。

**対応OAuthプロバイダー:**
- Google
- Facebook  
- Apple
- Twitch
- Slack
- AWS (テナント単位)

**特徴:**
- メアドだけでウォレット生成（シードフレーズ不要）
- OAuthプロバイダーのみを信頼（中間者不要）
- Sponsored Txと組み合わせてガス代ゼロ体験が可能
- Multisigとも統合可能

---

## 2. 認証フロー {#auth-flow}

```
┌──────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ User │────>│ OAuth    │────>│ ZK Proof │────>│ SUI      │
│      │     │ Provider │     │ Service  │     │ Network  │
└──────┘     └──────────┘     └──────────┘     └──────────┘
  │               │                │                │
  │ 1. Login      │                │                │
  │──────────────>│                │                │
  │               │                │                │
  │ 2. JWT        │                │                │
  │<──────────────│                │                │
  │               │                │                │
  │ 3. JWT + Salt + Ephemeral PK   │                │
  │───────────────────────────────>│                │
  │               │                │                │
  │ 4. ZK Proof   │                │                │
  │<───────────────────────────────│                │
  │               │                │                │
  │ 5. Tx + Ephemeral Sig + ZK Proof               │
  │────────────────────────────────────────────────>│
  │               │                │                │
  │ 6. Tx Result  │                │                │
  │<────────────────────────────────────────────────│
```

### ステップ詳細

1. **Ephemeral KeyPair 生成**: セッション用の一時的な鍵ペアを生成
2. **OAuth認証**: nonceにEphemeral公開鍵を埋め込んでOAuth認証
3. **JWT取得**: プロバイダーからJWTを受け取る
4. **Salt生成**: ユーザー固有のSaltを生成（ユーザーごとに一意）
5. **ZK Proof取得**: JWT + Salt + Ephemeral PKからゼロ知識証明を生成
6. **トランザクション送信**: Ephemeral秘密鍵で署名 + ZK Proofを添付

---

## 3. React 実装例 {#react-implementation}

### セットアップ

```bash
npm install @mysten/sui @mysten/zklogin @mysten/dapp-kit
```

### 認証サービス（authService.ts）

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness, getZkLoginSignature } from '@mysten/zklogin';
import { SuiClient } from '@mysten/sui/client';
import { jwtDecode } from 'jwt-decode';

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const REDIRECT_URI = 'http://localhost:5173/callback';
const SUI_PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';
const SALT_SERVER_URL = 'YOUR_SALT_SERVER'; // または固定Salt

const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

// 1. Ephemeral KeyPair 生成
export function createEphemeralKeyPair() {
    const keypair = new Ed25519Keypair();
    // localStorageに保存（セッション中のみ有効）
    localStorage.setItem('ephemeral_keypair', JSON.stringify({
        publicKey: keypair.getPublicKey().toBase64(),
        secretKey: keypair.export().privateKey,
    }));
    return keypair;
}

// 2. OAuth URL 生成
export async function getOAuthUrl() {
    const keypair = createEphemeralKeyPair();
    const randomness = generateRandomness();
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + 2; // 2エポック後に期限切れ

    const nonce = generateNonce(
        keypair.getPublicKey(),
        maxEpoch,
        randomness,
    );

    localStorage.setItem('maxEpoch', maxEpoch.toString());
    localStorage.setItem('randomness', randomness);

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'id_token',
        scope: 'openid',
        nonce: nonce,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// 3. コールバック処理
export async function handleCallback(jwt: string) {
    const decoded = jwtDecode(jwt);
    const salt = await getSalt(decoded.sub); // ユーザー固有Salt

    // ZK Proof 取得
    const proof = await fetch(SUI_PROVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jwt,
            extendedEphemeralPublicKey: getEphemeralPublicKey(),
            maxEpoch: localStorage.getItem('maxEpoch'),
            jwtRandomness: localStorage.getItem('randomness'),
            salt: salt,
            keyClaimName: 'sub',
        }),
    }).then(r => r.json());

    localStorage.setItem('zkProof', JSON.stringify(proof));
    localStorage.setItem('userSalt', salt);

    return { proof, address: getZkLoginAddress(jwt, salt) };
}
```

### 寄付トランザクション（donation.ts）

```typescript
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = 'YOUR_PUBLISHED_PACKAGE_ID';
const DONATION_BOX_ID = 'YOUR_DONATION_BOX_OBJECT_ID';

export async function roundUpDonate(
    suiClient: SuiClient,
    roundTo: number, // 100, 1000 等
) {
    const tx = new Transaction();

    // ユーザーの全SUIコインを取得してマージ
    const coins = await suiClient.getCoins({
        owner: getCurrentAddress(),
        coinType: '0x2::sui::SUI',
    });

    // PTBで端数計算 → 寄付実行
    tx.moveCall({
        target: `${PACKAGE_ID}::donation::round_up_donate`,
        arguments: [
            tx.object(DONATION_BOX_ID),
            tx.object(coins.data[0].coinObjectId),
            tx.pure.u64(roundTo),
            tx.object('0x6'), // Clock object
        ],
    });

    // zkLogin署名で送信
    return signAndExecuteWithZkLogin(tx);
}

export async function sweepDustAndDonate(
    suiClient: SuiClient,
    dustCoinIds: string[],
) {
    const tx = new Transaction();

    const coinObjects = dustCoinIds.map(id => tx.object(id));

    tx.moveCall({
        target: `${PACKAGE_ID}::donation::sweep_and_donate`,
        arguments: [
            tx.object(DONATION_BOX_ID),
            tx.makeMoveVec({ elements: coinObjects }),
            tx.object('0x6'),
        ],
    });

    return signAndExecuteWithZkLogin(tx);
}
```

---

## 4. Enoki SDK 簡易統合 {#enoki}

Enoki（Mysten Labs提供）を使うと、zkLoginとSponsored Transactionsの統合が大幅に簡略化される。

```typescript
import { EnokiClient } from '@mysten/enoki';

const enokiClient = new EnokiClient({
    apiKey: 'YOUR_ENOKI_API_KEY',
});

// Enoki経由のzkLogin
const { address } = await enokiClient.createZkLoginSession({
    jwt: googleJwt,
});

// Sponsored Transaction
const sponsoredTx = await enokiClient.createSponsoredTransaction({
    network: 'testnet',
    transaction: tx,
    sender: address,
});
```

---

## 5. Sponsored Transactions {#sponsored-tx}

ユーザーのガス代をdApp側が負担する仕組み。寄付アプリでは特に重要。

```typescript
import { SuiClient } from '@mysten/sui/client';

// Sui Gas Pool (Mysten Labs) を使う場合
// https://github.com/MystenLabs/sui-gas-pool

// または Enoki のスポンサー機能を使用
```

**ビジネスロジック:**
- 寄付額が一定以下（例: 0.1 SUI以下）の場合はガス代をスポンサー
- ガス代 > 寄付額 にならないよう最低寄付額を設定
- スポンサー予算を月次で管理

---

## 6. 注意事項・トラブルシューティング {#caveats}

### Salt管理
- Saltが変わるとアドレスが変わる → 以前のアドレスにアクセスできなくなる
- Saltは安全にバックアップする仕組みが必須
- 選択肢: 自前Saltサーバー、ユーザーのメールハッシュ固定、Enoki管理

### Ephemeral Key有効期限
- maxEpochを超えるとEphemeral Keyが失効
- 典型的には2-3エポック（数時間〜1日）
- 期限切れ時は再認証フローを案内

### ブラウザ・デバイス間の移行
- localStorageベースなので、別ブラウザ/デバイスでは同じアドレスにアクセスできない
- Saltのバックアップ・復元フローを用意すること

### テストネット vs メインネット
- Prover URLが異なる
  - Devnet: `https://prover-dev.mystenlabs.com/v1`
  - Testnet/Mainnet: `https://prover.mystenlabs.com/v1`
- Gas Faucetはテストネットのみ利用可能
