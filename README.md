# 血の気が多い診断（DevFest 2026 Hackathon）

ムカついたことを書くと、Gemini が受け止めてユーモアで献血をすすめる Web アプリ。

- フレームワーク: Next.js（App Router / TypeScript / Tailwind CSS）
- AI: Gemini API（`@google/genai`）
- 実行基盤: Firebase App Hosting（`main` に push すると自動デプロイ）

## セットアップ（3ステップ）

必要なもの: **Node.js 22**（`node -v` で確認。nvm を使っている人は `nvm use` で揃う）

```bash
git clone https://github.com/nikkiy30/proj-devfest-2026.git
cd proj-devfest-2026
npm install
cp .env.example .env.local   # GEMINI_API_KEY を書き込む
npm run dev                  # http://localhost:3000
```

Gemini API キーは [Google AI Studio](https://aistudio.google.com/apikey) で各自発行してください（無料枠あり）。

## よく使うコマンド

| コマンド         | 内容                                            |
| ---------------- | ----------------------------------------------- |
| `npm run dev`    | 開発サーバーを起動                              |
| `npm run check`  | lint・型チェック・フォーマット確認（CI と同じ） |
| `npm run format` | コードを自動で整形                              |
| `npm run build`  | 本番ビルド                                      |

VS Code を使う場合は、推奨拡張機能（ESLint / Prettier / Tailwind）を入れると保存時に自動整形されます。

## 開発の流れ

1. `main` から作業ブランチを切る（例: `feat/diagnose-prompt`）
2. push して Pull Request を作る → GitHub Actions で `check` と `build` が走る
3. レビュー後 `main` にマージ → Firebase App Hosting が自動でデプロイ

## ディレクトリ構成

```
src/
  app/
    page.tsx              トップページ
    diagnose-form.tsx     入力フォーム（ブラウザ側）
    api/diagnose/route.ts 診断 API（サーバー側で Gemini を呼ぶ）
  lib/
    gemini.ts             Gemini クライアント（サーバー専用）
apphosting.yaml           Firebase App Hosting の設定
```

API キーはサーバー側（`src/lib/gemini.ts`）でだけ読みます。`NEXT_PUBLIC_` を付けるとブラウザに漏れるので付けないでください。

## デプロイ環境の初期設定（担当者が1回だけ）

1. [Firebase コンソール](https://console.firebase.google.com/)でプロジェクトを作成し、**Blaze プラン**にする（App Hosting に必要）
2. 「App Hosting」→「始める」で、この GitHub リポジトリと `main` ブランチを接続する
3. Gemini API キーを Secret Manager に登録する
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase apphosting:secrets:set GEMINI_API_KEY --project <プロジェクトID>
   ```
4. `main` に push すると自動でデプロイされる

## 注意

この診断はジョークです。「献血で怒りが収まる」といった医学的な主張に見えないよう、プロンプトと画面の表現に気をつけてください。
