# BOXBOM 💥

12個の箱から爆弾を避けろ！ 2人対戦のオンライン心理戦ゲーム。

Cloudflare Workers + Durable Objects の上で完結しているので、外部のデータベースも
常時起動のサーバーも不要。無料プランのまま放置しても遊べなくならない。

## セットアップ

```bash
npm install
```

## 開発

UI だけ触る場合（HMR あり）:

```bash
npm run dev:api   # ターミナル1: API / WebSocket (wrangler dev, :8787)
npm run dev       # ターミナル2: UI (next dev, :3000)
```

本番と同じ構成をまとめて確認する場合:

```bash
npm run preview   # next build → wrangler dev。http://localhost:8787
```

## デプロイ

初回のみ Cloudflare にログインする:

```bash
npx wrangler login
```

あとは:

```bash
npm run deploy
```

`https://boxbom.<アカウント名>.workers.dev` で公開される。
独自ドメインを使う場合は `wrangler.jsonc` に `routes` を追加する。

## 構成

- `src/` … Next.js（静的書き出し）。画面とゲームUI
- `worker/` … Cloudflare Worker。API・WebSocket・静的アセット配信
- `worker/room.ts` … ルーム1つ = Durable Object 1つ。ゲームの正本となる状態はここにだけ存在する

詳しい設計方針は [CLAUDE.md](./CLAUDE.md) を参照。
