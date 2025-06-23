# Member API 移行ガイド

## 概要
Member APIを新しいエンドポイントに移行するための設定方法と注意事項をまとめています。

## 環境変数の設定

### 旧API（デフォルト）
```
VITE_MEMBER_API_BASE_URL=https://ehfm6q914a.execute-api.ap-northeast-1.amazonaws.com/member
```

### 新API
```
VITE_MEMBER_API_BASE_URL=https://web3.bon-soleil.com/api
```

## 実装内容

### 1. 自動判定機能
`memberService.ts`は環境変数のURLに基づいて自動的に新旧APIを判定します：
- URLに`web3.bon-soleil.com`が含まれている場合：新API
- それ以外：旧API

### 2. データマッピング
新APIから取得したデータは自動的に既存の形式にマッピングされます：

| 旧APIフィールド | 新APIフィールド | 備考 |
|---|---|---|
| Nick | display_name | 表示名 |
| Username | username | ユーザー名 |
| DiscordId | user_id | Discord ID |
| Icon | avatar_url | アバター画像URL |
| Roles | roles（名前のみ抽出） | ロール配列 |
| Expired | - | "EMPTY"を返す |
| Updated | - | "EMPTY"を返す |
| DeleteFlag | - | falseを返す |
| PartitionName | - | "EMPTY"を返す |

### 3. 不足データの扱い
新APIに存在しないフィールドは以下のように処理されます：
- 文字列フィールド：`"EMPTY"`
- ブール値フィールド：`false`
- 配列フィールド：空配列 `[]`

## 移行手順

1. `.env`ファイルで新しいAPIのURLを設定
2. アプリケーションを再起動
3. ブラウザの開発者ツールでコンソールログを確認
4. 正常に動作していることを確認

## 動作確認
コンソールログで以下を確認できます：
- `🌐 API CALL:` - API呼び出し開始
- `🔍 Trying address with new API:` - 新API使用時のログ
- `📋 Raw new API response:` - 新APIからの生レスポンス
- `✅ Member info mapped from new API:` - マッピング後のデータ

## トラブルシューティング

### 問題：メンバー情報が表示されない
- 環境変数が正しく設定されているか確認
- 新APIが稼働しているか確認
- EOAアドレスがDiscordに登録されているか確認

### 問題：「EMPTY」が表示される
- これは仕様です。新APIに該当フィールドが存在しない場合の正常な動作です。