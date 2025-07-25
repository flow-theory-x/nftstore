# NFT ストア-スマートコントラクト仕様書

## 概要

NFT ストアは、ロイヤリティサポートを組み込んだ NFT（Non-Fungible Token）の作成、管理、取引のためのスマートコントラクトシステムです。システムは 2 つの主要なコントラクトで構成されています：

- `NftStore.sol`: ミント、バーン、管理機能を持つメイン NFT コントラクト
- `RoyaltyStandard.sol`: ERC-2981 ロイヤリティ標準を実装する抽象コントラクト

## コントラクト

### NftStore コントラクト

**継承**: `ERC721Enumerable`, `RoyaltyStandard`

#### 状態変数

| 変数名         | 型                         | 可視性  | 説明                                          |
| -------------- | -------------------------- | ------- | --------------------------------------------- |
| `_owner`       | address                    | public  | コントラクトオーナーのアドレス                |
| `_creator`     | address                    | public  | NFT クリエイターのアドレス                    |
| `_feeRate`     | uint256                    | private | ロイヤリティ手数料率（パーセンテージ）        |
| `_mintFee`     | uint256                    | public  | NFT ミントに必要な手数料                      |
| `_metaUrl`     | mapping(uint256 => string) | private | トークン ID からメタデータ URL へのマッピング |
| `_lastId`      | uint256                    | public  | 最後にミントされたトークン ID                 |
| `_creatorOnly` | bool                       | public  | クリエイターのみのミント制限フラグ            |

#### コンストラクタ

```solidity
constructor(
    string memory name,
    string memory symbol,
    address creator,
    uint256 feeRate
)
```

**パラメータ**:

- `name`: NFT コレクション名
- `symbol`: NFT コレクションシンボル
- `creator`: NFT クリエイターのアドレス
- `feeRate`: ロイヤリティ手数料率（パーセンテージ）

**初期状態**:

- デプロイヤーをオーナーに設定
- クリエイターアドレスを設定
- ロイヤリティ手数料率を設定
- ミント手数料を 0 に初期化
- クリエイターのみミントモードを有効化

#### コア機能

##### `mint(address to, string memory metaUrl)`

指定されたアドレスに新しい NFT をミントします。

**アクセス制御**: クリエイターまたはオーナー（`_creatorOnly`が true の場合）、または誰でも（`_creatorOnly`が false の場合）

**要件**:

- 有効な場合、クリエイターのみ制限を満たす必要がある
- 十分なミント手数料を送信する必要がある（`msg.value >= _mintFee`）

**処理**:

1. `_lastId`をインクリメント
2. メタデータ URL を保存
3. 受信者にトークンをミント
4. トークンロイヤリティを設定

##### `burn(uint256 tokenId)`

既存の NFT をバーンします。

**アクセス制御**: トークンオーナーまたは承認されたオペレーター

**処理**:

1. 呼び出し元の権限を確認
2. メタデータ URL をクリア
3. トークンをバーン

##### `tokenURI(uint256 tokenId)`

指定されたトークンのメタデータ URI を返します。

**戻り値**: メタデータ URL を含む文字列

#### 設定機能

##### `config(address creator, uint256 feeRate, bool creatorOnly)`

コントラクト設定を更新します。

**アクセス制御**: オーナーのみ

**パラメータ**:

- `creator`: 新しいクリエイターアドレス
- `feeRate`: 新しいロイヤリティ手数料率
- `creatorOnly`: クリエイターのみミントの有効/無効

##### `setMintFee(uint256 mintFee)`

ミント手数料要件を設定します。

**アクセス制御**: オーナーのみ

#### 参照機能

##### `getInfo()`

基本的なコントラクト情報を返します。

**戻り値**: `(address creator, uint256 lastId, bool creatorOnly)`

##### `getMintFee()`

現在のミント手数料を返します。

**戻り値**: `uint256` ミント手数料額

#### 財務機能

##### `withdraw()`

コントラクト残高を呼び出し元に出金します。

**アクセス制御**: オーナーまたはクリエイターのみ

**要件**:

- コントラクトに正の残高が必要

### RoyaltyStandard コントラクト

ERC-2981 ロイヤリティ標準を実装する**抽象コントラクト**。

#### 定数

| 定数                  | 値    | 説明                                  |
| --------------------- | ----- | ------------------------------------- |
| `INVERSE_BASIS_POINT` | 10000 | パーセンテージ計算において 100%を表す |

#### 構造体

```solidity
struct RoyaltyInfo {
    address recipient;
    uint16 feeRate;
}
```

#### 機能

##### `_setTokenRoyalty(uint256 tokenId, address recipient, uint256 value)`

トークンのロイヤリティ情報を設定する内部関数。

##### `royaltyInfo(uint256 tokenId, uint256 salePrice)`

トークン販売のロイヤリティ情報を返します。

**戻り値**: `(address receiver, uint256 royaltyAmount)`

## 標準準拠

### ERC-721

以下を含む ERC-721 標準の完全実装:

- 基本 NFT 機能
- トークン反復のための Enumerable 拡張
- トークン URI のための Metadata 拡張

### ERC-2981

NFT マーケットプレース向けロイヤリティ標準:

- ロイヤリティ情報クエリ
- 標準化されたロイヤリティ支払い計算

### ERC-165

以下のインターフェース検出をサポート:

- ERC-721 (`0x80ac58cd`)
- ERC-165 (`0x01ffc9a7`)
- ERC-2981 (ロイヤリティ標準)

## 使用パターン

### デプロイメント

1. コレクション名、シンボル、クリエイターアドレス、ロイヤリティ率でコントラクトをデプロイ
2. 必要に応じてミント手数料を設定（`setMintFee`）
3. 必要に応じてクリエイターのみ制限を調整（`config`）

### ミント

1. ミント手数料（設定されている場合）のための十分な ETH を確保
2. 受信者アドレスとメタデータ URL で`mint`を呼び出し
3. 自動ロイヤリティ設定でトークンがミントされる

### ロイヤリティ管理

- ロイヤリティはミント時に自動設定される
- 手数料率はパーセンテージ × 100 で計算（例：5% = 500）
- ERC-2981 標準によるマーケットプレース統合

## セキュリティ考慮事項

### アクセス制御

- オーナー制御: 設定、ミント手数料、出金
- クリエイター制御: ミント（有効時）、出金
- トークンオーナー: バーン、転送

### 手数料処理

- ミント手数料はコントラクトに保持される
- オーナーまたはクリエイターのみが資金を出金可能
- 自動手数料分配なし

### 検証

- ミント前のミント手数料検証
- URI クエリのトークン存在検証
- バーンの適切な所有権確認

## ガス最適化

- ロイヤリティ率に`uint16`を使用（65535 ベーシスポイントまで制限）
- メタデータとロイヤリティの効率的なマッピング構造
- 重要な機能での最小限の状態変更
