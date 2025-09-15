# MERN Chat App - Full Guide & Render Deployment

## 📁 プロジェクト構成

```
mern-chat-app/
├── backend/
│ ├── models/
│ │ ├── User.js
│ │ ├── Group.js
│ │ ├── GroupMember.js
│ │ └── Message.js
│ ├── routes/
│ │ ├── user.js
│ │ ├── message.js
│ │ └── group.js
│ ├── server.js
│ ├── socket/
│ │ └── index.js
│ ├── package.json
│ └── .env.development / .env.production
├── frontend/
│ ├── src/
│ │ ├── App.jsx
│ │ ├── pages/
│ │ │ ├── AuthPage.jsx
│ │ │ ├── GroupsPage.jsx
│ │ │ ├── ChatPage.jsx
│ │ │ └── AdminPage.jsx
│ │ └── components/
│ │ ├── layout/Layout.jsx
│ │ ├── ui/Profile.jsx
│ │ └── ...（その他コンポーネント）
│ ├── package.json
│ └── .env.development / .env.production
└── README.md
```

## ⚡ 主な機能

### ユーザー管理

- Firebase Auth を使用した認証
- プロフィール編集（名前・アイコン・自己紹介）
- 管理者権限を持つユーザーは特定グループの管理が可能

### グループ機能

- グループ作成 / プライベートグループ作成
- メンバー追加・削除
- メンバーの BAN / MUTE / ADMIN 設定
- 管理者はグループ内の全メッセージ・メンバー管理が可能

### メッセージ機能

- テキスト / ファイル（png, jpeg, gif, pdf, 最大 5MB）
- GIF 投稿（Giphy API 使用）
- 既読機能
- メッセージ検索（テキスト、ファイル名、GIF クエリ対応）
- Socket.io リアルタイム通信
  - メッセージ送信・受信のリアルタイム更新
  - ミュート中ユーザーは自身の画面のみ通知
  - グループ全体へのブロードキャスト

## 🗄️ 環境変数

### バックエンド

| 環境                    | 変数                            | 値 / 説明                                          |
| ----------------------- | ------------------------------- | -------------------------------------------------- |
| 開発 (.env.development) | MONGO_URI                       | MongoDB Atlas 接続文字列                           |
|                         | PORT                            | 5000                                               |
|                         | FIREBASE_STORAGE_BUCKET         | Firebase Storage Bucket URL                        |
| 本番 (.env.production)  | MONGO_URI                       | MongoDB Atlas 接続文字列                           |
|                         | PORT                            | 5000                                               |
|                         | FIREBASE_STORAGE_BUCKET         | Firebase Storage Bucket URL                        |
|                         | FIREBASE_SERVICE_ACCOUNT_BASE64 | Firebase Service Account JSON を base64 エンコード |

### フロントエンド

| 環境                    | 変数                              | 値 / 説明                        |
| ----------------------- | --------------------------------- | -------------------------------- |
| 開発 (.env.development) | VITE_API_URL                      | http://localhost:5000/api        |
|                         | VITE_SOCKET_URL                   | http://localhost:5000            |
| 本番 (.env.production)  | VITE_API_URL                      | https://<backend-render-url>/api |
|                         | VITE_SOCKET_URL                   | https://<backend-render-url>     |
| 共通                    | VITE_FIREBASE_API_KEY             | Firebase API Key                 |
|                         | VITE_FIREBASE_AUTH_DOMAIN         | Firebase Auth Domain             |
|                         | VITE_FIREBASE_PROJECT_ID          | Firebase Project ID              |
|                         | VITE_FIREBASE_STORAGE_BUCKET      | Firebase Storage Bucket          |
|                         | VITE_FIREBASE_MESSAGING_SENDER_ID | Firebase Messaging Sender ID     |
|                         | VITE_FIREBASE_APP_ID              | Firebase App ID                  |
|                         | VITE_GIPHY_API_KEY                | Giphy API Key                    |

## 🔧 Render デプロイ手順

### 1. バックエンド (Web Service)

1. Render → New Web Service → GitHub リポジトリ → `backend`
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Environment Variables に `.env.production` の値を設定
5. デプロイ → 公開 URL を控える

### 2. フロントエンド (Static Site)

1. Render → New Static Site → GitHub リポジトリ → `frontend`
2. Build Command: `npm install && npm run build`
3. Publish Directory: `dist`
4. Environment Variables に `.env.production` の値を設定
5. デプロイ → 公開 URL を控える

## 📝 API 概要

### /api/users

- POST / → 新規ユーザー作成
- GET /:id → ユーザー情報取得
- PATCH /:id → ユーザー情報更新
- GET /:id/admin-groups → 管理者権限のあるグループ一覧取得

### /api/messages

- POST / → メッセージ送信（テキスト / ファイル）
- POST /gif → GIF 投稿
- GET /group/:groupId → グループメッセージ取得（BAN・MUTE 考慮）
- POST /:id/read → メッセージ既読更新
- GET /search?groupId=&query= → メッセージ検索

### /api/groups

- グループ作成 / メンバー管理 / 管理者権限設定

## 💡 注意事項

- Firebase サービスアカウント JSON は 絶対に公開しない
- Vite 環境変数は必ず `VITE_` プレフィックス
- Socket.io の URL はバックエンド URL と一致させる
- ミュート中のユーザーは自分のみメッセージ受信可能
- BAN ユーザーはメッセージ送信・閲覧不可

## ✅ 動作確認

1. フロント URL にアクセス → Firebase Auth でログイン
2. `/groups` にリダイレクト → グループ一覧表示
3. メッセージ送信 / ファイル・GIF 投稿
4. 既読・検索機能の確認
5. 管理者権限でグループ管理・BAN・MUTE 操作確認

## 🖼️ スクリーンショット

| ページ           | スクリーンショット                        |
| ---------------- | ----------------------------------------- |
| ログイン / 認証  | ![ログイン](./screenshots/login.png)      |
| グループ一覧     | ![グループ一覧](./screenshots/groups.png) |
| チャット画面     | ![チャット](./screenshots/chat.png)       |
| 管理者ページ     | ![管理者ページ](./screenshots/admin.png)  |
| Socket.io テスト | ![Socket.io](./screenshots/socket.png)    |
