# 作業確認ボード

飲食店の開店前・締め作業を、1台のiPadで確認するためのWebアプリです。作業状態、担当者、完了者と完了時刻を共有できます。

## 構成

- Next.js（Vercel）
- Neon PostgreSQL
- 4桁の店舗用アクセスPIN

## ローカル起動

```bash
npm install
cp .env.example .env.local
npm run db:push
npm run dev
```

`.env.local`には次の値を設定します。

```dotenv
DATABASE_URL=Neonの接続文字列
SITE_ACCESS_PIN=4桁の数字
```

## Vercel公開

1. GitHubリポジトリをVercelプロジェクトへ接続します。
2. Vercel MarketplaceからNeonを追加します。
3. `DATABASE_URL`と`SITE_ACCESS_PIN`をProduction環境へ設定します。
4. `npm run db:push`で初期テーブルを作成します。
5. Production Deploymentを実行します。

PINやデータベース接続文字列はGitHubへ保存しません。店舗版と就職活動用デモ版は、別のVercelプロジェクトとデータベースに分けてください。
