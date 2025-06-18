# サービス仕様書

NFTストアアプリケーションで使用されるユーティリティサービスの詳細仕様

## 1. NftContractService

### 概要
NFTコントラクトとの相互作用を管理するメインサービス

### 主要機能

#### 1.1 コントラクト基本情報
- `getName()`: コントラクト名を取得（キャッシュなし）
- `getTotalSupply()`: 総供給量を取得（キャッシュなし）
- `getMintFee()`: ミント手数料を取得
- `getContractInfo()`: コントラクト詳細情報を取得

#### 1.2 トークン操作
- `mint()`: 新しいNFTをミント
- `burn()`: NFTをバーン（deadアドレスに送信）
- `transfer()`: NFTを他のアドレスに転送

#### 1.3 トークン情報取得
- `getTokenURI()`: トークンのメタデータURIを取得（**キャッシュあり**）
- `getOwnerOf()`: トークンの所有者を取得（キャッシュなし）
- `fetchMetadata()`: HTTPでメタデータを取得（**キャッシュあり**）

#### 1.4 バッチ処理
- `getTokensBatch()`: 指定範囲のトークンをバッチ取得（**キャッシュあり**）
- `getTokensBatchWithProgress()`: 進捗付きバッチ取得（**キャッシュあり**）

#### 1.5 所有者別検索
- `getBalanceOf()`: アドレスの保有数を取得（キャッシュなし）
- `getTokensByOwner()`: 所有者のトークン一覧を取得
- `getTokensByOwnerWithProgress()`: 進捗付き所有者トークン取得

### キャッシュ戦略
- **キャッシュしない**: `getName()`, `getOwnerOf()`, `getBalanceOf()`, `getTotalSupply()`
- **キャッシュする**: `getTokenURI()`, `fetchMetadata()`, バッチ取得結果

---

## 2. TbaService (Token Bound Account Service)

### 概要
ERC-6551トークンバウンドアカウント（TBA）の作成・管理サービス

### 主要機能

#### 2.1 アカウント計算・作成
- `computeAccountAddress()`: TBAアドレスを計算（**キャッシュあり**）
- `createAccount()`: 新しいTBAアカウントを作成
- `createAccountForToken()`: 特定トークン用のTBA作成（デフォルトパラメータ使用）

#### 2.2 アカウント状態確認
- `isAccountDeployed()`: アカウントがデプロイ済みかチェック（**キャッシュあり**）
- `getAccountBalance()`: アカウントの残高を取得（**キャッシュあり**）
- `getAccountInfo()`: アカウント情報を一括取得

#### 2.3 アカウント操作
- `executeTransaction()`: TBAアカウントからトランザクション実行
- `getAccountContract()`: TBAアカウントコントラクトインスタンス取得
- `getAccountOwner()`: TBAアカウントの所有者を取得（**キャッシュあり**）

#### 2.4 NFT管理
- `getTBAOwnedTokens()`: TBAが保有するNFTを検索（**キャッシュあり**、5分TTL）

### デフォルトパラメータ
- implementation: `TBA_ACCOUNT_IMPLEMENTATION`
- salt: `"1"`
- chainId: `CHAIN_ID`
- initData: `"0x"`

---

## 3. TBATokenFinder

### 概要
効率的なNFT所有権検索に特化した独立ユーティリティ

### 主要機能

#### 3.1 効率的検索
- `findOwnedTokens()`: Transfer イベントベースの効率的検索
  - タイムアウト: 10秒
  - フォールバック: 直接 `ownerOf` チェック

#### 3.2 フォールバック検索
- `fallbackTokenSearch()`: 直接的な所有権確認
  1. `tokenOfOwnerByIndex()` 優先（最効率）
  2. `tokenByIndex()` でフォールバック
  3. 範囲検索でフォールバック

#### 3.3 マルチコントラクト検索
- `findOwnedTokensAcrossContracts()`: 複数コントラクトでの一括検索

### 検索戦略
1. **イベントベース検索**（優先）
2. **enumerable拡張検索**（フォールバック）
3. **ブルートフォース検索**（最終手段）

---

## 4. WalletService

### 概要
MetaMaskウォレット接続・管理サービス

### 主要機能

#### 4.1 ウォレット接続
- `connectWallet()`: ウォレット接続とアカウント取得
- `getConnectedAccount()`: 接続済みアカウント確認
- `getSigner()`: 署名者インスタンス取得
- `getProvider()`: プロバイダーインスタンス取得

#### 4.2 ネットワーク管理
- `switchToPolygon()`: Polygonネットワークに自動切り替え
  - 存在しない場合は自動追加

#### 4.3 イベントリスナー
- `onAccountsChanged()`: アカウント変更イベント
- `onChainChanged()`: チェーン変更イベント
- `removeAllListeners()`: 全リスナー削除

---

## 5. CacheService

### 概要
アプリケーション全体のキャッシュ管理サービス

### キャッシュ種別

#### 5.1 MemoryCache
- **用途**: 短期間の高速アクセス
- **デフォルトTTL**: 5分
- **ストレージ**: メモリ内Map

#### 5.2 LocalStorageCache
- **用途**: 永続化キャッシュ
- **デフォルトTTL**: 30分
- **ストレージ**: ブラウザLocalStorage

### キャッシュカテゴリ

#### 5.3 コントラクトデータ
- `getContractData()` / `setContractData()`
- **TTL**: 30分（`allTokenIds`は1分）

#### 5.4 トークンメタデータ
- `getTokenMetadata()` / `setTokenMetadata()`
- **TTL**: 30分

#### 5.5 トークン情報
- `getTokenInfo()` / `setTokenInfo()`
- **TTL**: 10分

#### 5.6 所有者情報
- `getOwnerInfo()` / `setOwnerInfo()`
- **TTL**: 5分

#### 5.7 バッチデータ
- `getBatchTokens()` / `setBatchTokens()`
- **TTL**: 3分

### キャッシュ管理
- `clearAll()`: 全キャッシュクリア
- `clearContract()`: 特定コントラクトのキャッシュクリア

---

## 6. 共通仕様

### 6.1 エラーハンドリング
- 全サービスで統一されたエラーログ出力
- try-catch による適切な例外処理
- ユーザーフレンドリーなエラーメッセージ

### 6.2 ログ出力
- `🔗 Blockchain CALL`: ブロックチェーン直接呼び出し
- `📋 Cache HIT`: キャッシュからの取得
- `💾 Cache SET`: キャッシュへの保存
- `🔥 Skipping burned token`: バーン済みトークンのスキップ

### 6.3 バーン対応
- deadアドレス (`DEAD_ADDRESS`) 所有のトークンは自動的にスキップ
- 全検索機能でバーン済みトークンを除外

### 6.4 型安全性
- TypeScript による厳密な型定義
- インターフェースによる契約の明確化

---

## 7. パフォーマンス最適化

### 7.1 キャッシュ戦略
- 変更頻度に応じたTTL設定
- メモリとLocalStorageの使い分け
- 重複呼び出しの回避

### 7.2 バッチ処理
- 複数のブロックチェーン呼び出しをバッチ化
- Promise.allSettled による並列実行
- タイムアウト制御

### 7.3 プログレッシブローディング
- 進捗表示付きの段階的データ取得
- ユーザーエクスペリエンスの向上

---

## 8. セキュリティ

### 8.1 アドレス検証
- ethers.js による厳密なアドレス検証
- 大文字小文字を区別しない比較

### 8.2 権限チェック
- トークン操作前の所有者確認
- 署名者の検証

### 8.3 入力サニタイズ
- 数値パラメータの適切な変換
- 文字列の trimming

---

この仕様書は各サービスの正確な動作と使用方法を理解するためのリファレンスとしてご活用ください。