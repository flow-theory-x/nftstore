# Member API 移行ガイド

## 概要

Member API を新しいエンドポイントに移行するための設定方法と注意事項をまとめています。

## 環境変数の設定

### 旧 API（デフォルト）

```
VITE_MEMBER_API_BASE_URL=https://web3.bon-soleil.com/oldapi/member
```

### 新 API

```
VITE_MEMBER_API_BASE_URL=https://web3.bon-soleil.com/api
```

## 実装内容

### 1. 自動判定機能

`memberService.ts`は環境変数の URL に基づいて自動的に新旧 API を判定します：

- URL に`web3.bon-soleil.com`が含まれている場合：新 API
- それ以外：旧 API

### 2. データマッピング

新 API から取得したデータは自動的に既存の形式にマッピングされます：

| 旧 API フィールド | 新 API フィールド     | 備考             |
| ----------------- | --------------------- | ---------------- |
| Nick              | display_name          | 表示名           |
| Username          | username              | ユーザー名       |
| DiscordId         | user_id               | Discord ID       |
| Icon              | avatar_url            | アバター画像 URL |
| Roles             | roles（名前のみ抽出） | ロール配列       |
| Expired           | -                     | "EMPTY"を返す    |
| Updated           | -                     | "EMPTY"を返す    |
| DeleteFlag        | -                     | false を返す     |
| PartitionName     | -                     | "EMPTY"を返す    |

### 3. 不足データの扱い

新 API に存在しないフィールドは以下のように処理されます：

- 文字列フィールド：`"EMPTY"`
- ブール値フィールド：`false`
- 配列フィールド：空配列 `[]`

## 移行手順

1. `.env`ファイルで新しい API の URL を設定
2. アプリケーションを再起動
3. ブラウザの開発者ツールでコンソールログを確認
4. 正常に動作していることを確認

## 動作確認

コンソールログで以下を確認できます：

- `🌐 API CALL:` - API 呼び出し開始
- `🔍 Trying address with new API:` - 新 API 使用時のログ
- `📋 Raw new API response:` - 新 API からの生レスポンス
- `✅ Member info mapped from new API:` - マッピング後のデータ

## トラブルシューティング

### 問題：メンバー情報が表示されない

- 環境変数が正しく設定されているか確認
- 新 API が稼働しているか確認
- EOA アドレスが Discord に登録されているか確認

### 問題：「EMPTY」が表示される

- これは仕様です。新 API に該当フィールドが存在しない場合の正常な動作です。
