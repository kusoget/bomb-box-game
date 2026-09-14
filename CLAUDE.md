# BOXBOM

2人対戦のオンライン心理戦ゲーム。12個の箱のうち1つに爆弾が仕掛けられており、
仕掛け役と開け役を交代しながら得点を奪い合う。

## 技術スタック

| 役割 | 使っているもの |
|---|---|
| UI | Next.js 16 (App Router) / React 19 / CSS Modules — **静的書き出し** (`output: 'export'`) |
| 配信・API | Cloudflare Workers（`worker/index.ts`）+ Static Assets |
| ルームの状態・リアルタイム同期 | Durable Objects（SQLite backend）+ WebSocket |

**Vercel / Supabase は使っていない**（2026-09 に全面移行）。
外部SaaSに依存しないので、無料プランのまま放置してもスリープや一時停止で遊べなくなることがない。

## 構成

```
src/app/              画面（すべて 'use client'。SSR は使っていない）
  page.tsx            トップ（ルーム作成／参加／招待）
  room/page.tsx       ロビー & 対戦画面。ルームは ?code=XXXXXX で指定
  preview/            デザイン確認用の静的プレビュー
src/components/       UI コンポーネント
src/hooks/useGameState.ts   Durable Object と WebSocket でつなぐ唯一の通信口
src/lib/rules.ts      ゲームルール（純粋関数。ブラウザと Worker が共有）
src/lib/gameLogic.ts  rules.ts の再エクスポート + UI 専用ヘルパー
src/types/game.ts     ゲームの型
src/types/realtime.ts WebSocket のメッセージ定義
worker/index.ts       ルーター（/api/rooms、WebSocket、静的アセットへのフォールバック）
worker/room.ts        RoomDO — ルーム1つ = Durable Object 1つ
```

## 設計方針

- **状態はすべてサーバー（Durable Object）が持つ。** 得点計算・勝敗判定・フェーズ遷移は
  `worker/room.ts` の `#apply()` でのみ行う。クライアントは「操作」だけを送り、
  計算結果は送らない（旧 Supabase 版はクライアント計算だったので改ざんできた）。
- **爆弾の位置は仕掛け役にしか配信しない。** `maskGameState()` が受信者ごとに `isTrapped` を
  伏せる。結果発表フェーズ以降は全員に開示される。
- **`src/lib/rules.ts` に React / Next / Node 固有のものを持ち込まない。**
  Worker からも読まれるので、import は相対パスのみ（`@/` エイリアスは解決できない）。
- ルームは最終更新から3時間で Durable Object の alarm により自動削除される。

## 開発

```bash
npm run dev      # UI のみ :3000（API は .env.development 経由で :8787 を見る）
npm run dev:api  # 別ターミナルで wrangler dev :8787
npm run preview  # 本番と同じ構成をローカルで（next build → wrangler dev :8787）
npm run deploy   # next build → wrangler deploy
npm run typecheck
```

`npm run dev` 単体では API が動かない。ゲームの通信を触るときは `dev:api` も起動するか、
`npm run preview` を使う。
