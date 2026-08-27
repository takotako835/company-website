# コーポレートサイト制作プロジェクト

Claude Code で自社HPを制作するためのドキュメント一式です。
世界レベルの Webデザイナー / UXデザイナー / コピーライター / エンジニア の観点をガイドラインとして分冊し、Claude Code が常に参照しながら実装する構成になっています。

## サイトの開発・ビルド

Astro + Tailwind CSS で実装済みです(Node.js 20以上が必要)。

```bash
npm install      # 初回のみ
npm run dev      # 開発サーバー起動(http://localhost:4321)
npm run build    # 本番ビルド(dist/ に静的ファイルを出力)
npm run preview  # ビルド結果のプレビュー
npm run lint     # 型・構文チェック(astro check)
```

### お知らせの追加・更新

`src/content/news/` に Markdown ファイルを追加するだけで、一覧・記事ページ・sitemap に自動反映されます。

```yaml
---
title: "記事タイトル"
date: 2026-08-27
category: "お知らせ"   # お知らせ | プレスリリース
draft: false           # true にすると非公開
---

本文を Markdown で書きます。
```

## デプロイ(Render)

**手順書: [docs/07_deploy-render.md](docs/07_deploy-render.md)** — GitHub への公開からメール送信の設定、独自ドメインまで、画面操作を1つずつ書いています。

Render の **Web Service**(Node)として動かします。お問い合わせフォームのメール送信にサーバーが必要なためです。リポジトリ直下の `render.yaml` に設定が入っているので、Render の「Blueprint」から接続するだけで公開できます。以降は `main` ブランチへ push すれば自動で再デプロイされます。

公開URLは環境変数 `SITE_URL` で切り替わり、canonical / OGP / sitemap / robots.txt にまとめて反映されます(コードの書き換えは不要)。

### 環境変数

`.env.example` をコピーして `.env` を作ると、開発サーバーで使えます。本番は Render の画面で設定します。

| 変数 | 用途 |
|---|---|
| `SITE_URL` | サイトの公開URL。canonical / OGP / sitemap / robots.txt に反映 |
| `RESEND_API_KEY` | Resend の API キー。**秘密の値** |
| `MAIL_FROM` | メールの差出人。ドメインは Resend で認証したもの |
| `CONTACT_TO` | お問い合わせの届け先アドレス |

> お問い合わせフォームは、**メール送信の3つがすべて揃っているときだけ表示されます。**
> 1つでも欠けている場合は、フォームを出さずにLINE導線の案内へ切り替わります
> (壊れたフォームを公開しないため)。

### 公開前に確定が必要なこと(TODO)

- **ドメイン**: 独自ドメイン確定後、Render の `SITE_URL` と `astro.config.mjs` の `DEFAULT_SITE_URL` を更新する
- **OGP画像**: `public/ogp.png` はロゴを配置した仮版。デザイン版ができたら差し替える(1200×630px)
- **公開日**: `src/content/news/2026-website-launch.md` の date を実際の公開日に更新する
- コード内の `TODO:` コメント(所在地・支援実績・30秒診断への導線など、ユーザー確認待ちの項目)

### リリース後

- Google Search Console にサイトを登録し、`https://<本番ドメイン>/sitemap-index.xml` を送信する
- SNSデバッガー(X / Facebook)で OGP の表示を確認する

## 使い方

### 1. 自社情報を埋める

`docs/00_project-brief.md` を開き、`{{ }}` の箇所を自社の情報で埋めます(**ここが最重要**)。
分かる範囲で構いません。空欄は Claude Code が実装前に質問します。

### 2. Claude Code を起動

```bash
cd company-website
claude
```

### 3. 最初の指示例

```
docs/00_project-brief.md を読んで、不明点を質問してください。
そのうえで docs/05_tech-spec.md に従ってプロジェクトの雛形を作成してください。
```

その後は例えば:

```
docs/content/home.md と各ガイドラインに従って、トップページを実装してください。
Heroコピーは3案提示してください。
```

### 4. レビュー用スラッシュコマンド

- `/review-design` — 実装がデザインシステムに準拠しているかチェック
- `/review-copy` — 文章が表記ルールに準拠しているかチェック
- `/new-page` — 新しいページをガイドライン準拠で追加

## フォルダ構成

```
company-website/
├── CLAUDE.md                     # Claude Code への最上位指示書
├── README.md                     # このファイル
├── .claude/commands/             # カスタムスラッシュコマンド
│   ├── review-design.md
│   ├── review-copy.md
│   └── new-page.md
└── docs/
    ├── 00_project-brief.md       # 要件定義(最初に記入)
    ├── 01_brand-guidelines.md    # ブランド定義
    ├── 02_design-system.md       # Webデザイナー観点
    ├── 03_ux-guidelines.md       # UXデザイナー観点
    ├── 04_copywriting-guide.md   # コピーライター観点
    ├── 05_tech-spec.md           # エンジニア観点
    ├── 06_seo-performance.md     # SEO・速度基準
    └── content/                  # ページ別の構成・原稿
        ├── home.md
        ├── about.md
        ├── services.md
        ├── news.md
        └── contact.md
```

## 参考

- Claude Code ドキュメント: https://docs.claude.com/en/docs/claude-code/overview
