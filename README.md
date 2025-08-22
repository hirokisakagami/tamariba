# 動画管理システム

動画投稿サイトの管理画面です。Cloudflare Streamと連携した動画のアップロード・管理、セクション管理、フロント表示の設定が行えます。

## 機能

- **動画管理**: Cloudflare Streamを使用した動画のアップロード・削除
- **セクション管理**: 「あなたにおすすめ」「トレンド」等のセクション管理
- **ドラッグ&ドロップ**: 直感的な順番入れ替え機能
- **フロント表示**: Netflix風デザインのプレビュー機能
- **ユーザー認証**: NextAuth.jsによる認証システム

## 技術スタック

- **フロントエンド**: Next.js 15, React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: SQLite (開発) / Turso (本番推奨)
- **認証**: NextAuth.js
- **動画処理**: Cloudflare Stream
- **デプロイ**: Vercel

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成し、必要な環境変数を設定してください。

```bash
cp .env.example .env
```

### 3. データベースのセットアップ

```bash
# Prismaマイグレーション実行
npx prisma migrate dev --name init

# Prismaクライアント生成
npx prisma generate
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

## デプロイ方法

### Vercelでのデプロイ

1. [Vercel](https://vercel.com)にアカウントを作成
2. GitHubリポジトリと連携
3. 環境変数を設定：
   - `DATABASE_URL`: Tursoのデータベース接続文字列
   - `NEXTAUTH_SECRET`: ランダムな秘密鍵
   - `NEXTAUTH_URL`: デプロイされたURLに設定
   - Cloudflare Stream関連の環境変数

### データベース設定（本番環境）

本番環境では**Turso**の使用を推奨します：

1. [Turso](https://turso.tech)にアカウント作成（無料枠あり）
2. データベースを作成
3. 接続文字列とトークンを取得
4. `.env`に設定

```bash
# Tursoの場合
DATABASE_URL="libsql://your-database-url.turso.io"
TURSO_AUTH_TOKEN="your-turso-auth-token"
```

## サムネイル仕様

### 推奨設定
- **アスペクト比**: 140:190 (約3:4の縦長)
- **推奨サイズ**: 420px × 570px以上
- **フォーマット**: JPG または PNG
- **ファイルサイズ**: 500KB以下推奨

### 表示サイズ
- **小サムネイル**: 140x190px (リスト表示)
- **大サムネイル**: 288x390px (フィーチャー表示)

## API仕様

### 動画関連
- `GET /api/videos` - 動画一覧取得
- `POST /api/videos` - 動画アップロード
- `DELETE /api/videos/[id]` - 動画削除

### セクション関連
- `GET /api/sections` - セクション一覧取得
- `POST /api/sections/[id]/items` - セクションに動画追加
- `PUT /api/sections/[id]/items` - セクション内動画の順番更新

### Cloudflare Stream URL
- **サムネイル**: `https://stream.cloudflare.com/{videoId}/thumbnails/thumbnail.jpg`
- **ストリーミング**: `https://stream.cloudflare.com/{videoId}/manifest/video.m3u8`

## フロントエンド実装例

プロジェクトには提供されたReact Nativeアプリのコード構造と互換性のあるAPI設計が含まれています。

### 基本的な使用方法

```javascript
// 動画一覧取得
const videos = await fetch('/api/videos').then(res => res.json())

// セクション一覧取得
const sections = await fetch('/api/sections').then(res => res.json())

// サムネイルURL生成
const thumbnailUrl = `https://stream.cloudflare.com/${videoId}/thumbnails/thumbnail.jpg?time=0s`

// ストリーミングURL生成
const streamUrl = `https://stream.cloudflare.com/${videoId}/manifest/video.m3u8`
```

## 初期セクション

新規ユーザー登録時に以下のデフォルトセクションが作成されます：

1. **フィーチャー** (featured) - 大きなサムネイルで表示される注目コンテンツ
2. **あなたにおすすめ** (for_you) - ユーザーにおすすめの動画
3. **トレンド** (trending) - 話題の動画
4. **コミュニティで人気** (community_popular) - コミュニティで人気の動画

## トラブルシューティング

### よくある問題

1. **動画がアップロードできない**
   - Cloudflare Stream APIキーを確認してください
   - ファイルサイズが適切か確認してください

2. **サムネイルが表示されない**
   - Cloudflare Streamでの動画処理が完了するまで待ってください
   - 動画IDが正しいか確認してください

3. **認証エラー**
   - `NEXTAUTH_SECRET`が設定されているか確認してください
   - 本番環境では`NEXTAUTH_URL`を正しいURLに設定してください

## ライセンス

MIT License
