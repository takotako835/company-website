# 05. 技術仕様書(エンジニア観点)

コーポレートサイトに過剰な技術は不要。「速い・壊れない・更新しやすい・安い」を満たす最小構成を選ぶ。

## 1. 技術選定

### 推奨構成(brief に指定がない場合)

| 項目 | 選定 | 理由 |
|---|---|---|
| フレームワーク | **Astro**(または Next.js App Router) | 静的生成でJS最小・高速。動的要件が少ないHPに最適 |
| スタイリング | Tailwind CSS | design-system のトークンを設定ファイルに落とし込める |
| フォーム | 外部サービス(Formspree / SSGForm 等)or API Route + メール送信 | サーバー管理を持たない |
| お知らせ管理 | Markdownファイル(`src/content/news/`) | 非エンジニア更新が必要なら microCMS / Newt を検討 |
| デプロイ | Vercel / Cloudflare Pages | Push で自動デプロイ・無料枠で十分 |
| 画像 | AVIF/WebP + `astro:assets` or `next/image` | 自動最適化 |

> インタラクティブ要件(会員機能・検索・多量の動的コンテンツ)が出てきたら Next.js を選ぶ。迷ったらユーザーに確認。

## 2. ディレクトリ構成(Astroの場合)

```
src/
├── components/
│   ├── ui/          # Button, Card などデザインシステム準拠の基礎部品
│   ├── layout/      # Header, Footer, Section
│   └── sections/    # HomeHero, ServiceList などページ固有セクション
├── content/
│   └── news/        # お知らせ (Markdown + frontmatter)
├── layouts/
│   └── Base.astro   # 共通レイアウト(meta, OGP含む)
├── pages/
│   ├── index.astro
│   ├── about.astro
│   ├── services.astro
│   ├── news/
│   │   ├── index.astro
│   │   └── [slug].astro
│   └── contact.astro
├── styles/
│   └── global.css   # デザイントークン(CSS変数)定義
└── lib/             # ユーティリティ
public/
├── favicon.svg
└── ogp.png
```

## 3. 実装規約

- **デザイントークン**: `02_design-system.md` の色・スペーシングを `tailwind.config` / CSS変数として一元定義。マジックナンバー禁止
- **コンポーネント**: 同じUIを2回書いたら共通化。ただし早すぎる抽象化もしない(3回目で抽象化)
- **TypeScript**: strict モード。`any` 禁止
- **命名**: コンポーネントは PascalCase、関数は camelCase、定数は UPPER_SNAKE
- **コメント**: 「何をしているか」ではなく「なぜそうしたか」を書く
- **依存追加**: 新しい npm パッケージ追加は理由をユーザーに説明してから

## 4. フォーム実装要件

- クライアント側バリデーション + サーバー(送信先)側でも検証
- スパム対策: honeypot フィールド + (必要なら)Cloudflare Turnstile
- 送信中は二重送信防止(ボタン disabled + ローディング表示)
- 失敗時はユーザーの入力値を保持したままエラー表示
- 個人情報をログに出力しない

## 5. セキュリティ

- 問い合わせ内容などの秘密情報を Git にコミットしない(`.env` は `.gitignore`)
- 外部スクリプトは必要最小限(計測タグ程度)
- HTTPヘッダ: `X-Content-Type-Options`, `Referrer-Policy` などをホスティング設定で付与
- 依存パッケージは `npm audit` をCIで実行

### 5b. キャッシュ制御(2026年8月28日 追加・`src/middleware.ts` で実装)

デプロイしても古い画面が表示され続ける事象があったため、HTMLは毎回サーバーに確認させる。

| 対象 | `Cache-Control` | 理由 |
|---|---|---|
| HTMLページ | `no-cache` | 保存はするが、使う前に必ずサーバーへ確認する。更新が即座に届く |
| `/admin`・`/api/` | `no-store` | ログイン状態で内容が変わるため、そもそも保存させない |
| `/_astro/` のアセット | `public, max-age=31536000, immutable`(Nodeアダプタの静的配信が付与) | ファイル名にハッシュが入り、内容が変われば名前が変わるため長期キャッシュで安全 |

- `no-cache` は「キャッシュ禁止」ではなく**「使う前に必ず確認する」**の意味。`no-store`(保存自体を禁止)とは別物
- HTMLをキャッシュさせない理由は更新反映だけではない。**A/Bテストの変種を訪問者ごとに割り当てている**ため、
  キャッシュされると割り当てが固定され、計測が壊れる
- 静的アセットは Node アダプタの静的配信が先に処理するため、ミドルウェアは通らない(長期キャッシュのまま)

## 6. 品質チェック(Definition of Done)

各ページは以下を満たすまで完成としない:

- [ ] 375px / 768px / 1440px で表示崩れなし
- [ ] Lighthouse: Performance 90+ / Accessibility 95+ / SEO 95+(モバイル)
- [ ] キーボードのみで全操作可能
- [ ] `npm run build` が警告なしで通る
- [ ] OGP・タイトル・ディスクリプションが設定済み(→ `06_seo-performance.md`)
- [ ] 表示テキストが `04_copywriting-guide.md` の表記ルールに準拠

## 7. Git 運用

- ブランチ: `main`(本番)/ 作業は `feat/xxx`, `fix/xxx`
- コミットメッセージ: `feat: トップページのHeroセクションを実装` のように日本語で目的を書く
- 1コミットは1つの論理的変更に対応させる
