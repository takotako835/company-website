# 06. SEO・パフォーマンス基準

コーポレートサイトのSEOの主目的は「社名・サービス名での確実な上位表示」と「指名検索時の正しい情報表示」。

## 1. 基本設定(全ページ必須)

- `<title>`: 「ページ名 | {{会社名}}」(トップのみ「{{会社名}} | {{一言の事業説明}}」)。全角32文字以内
- `meta description`: ページごとに固有。80〜120文字で内容と価値を要約
- canonical URL の設定
- OGP: `og:title` / `og:description` / `og:image`(1200×630px)/ `twitter:card`
- favicon(SVG + PNG フォールバック)

## 2. 構造化データ(JSON-LD)

- 全ページ: `Organization`(社名・ロゴ・住所・連絡先)
- パンくず: `BreadcrumbList`
- お知らせ記事: `Article`
- FAQがあるページ: `FAQPage`

## 3. 技術SEO

- `sitemap.xml` 自動生成 + `robots.txt`
- セマンティックHTML: `<header>` `<nav>` `<main>` `<footer>` / 見出し階層の正しさ
- 1ページに `<h1>` は1つ
- URL: 小文字・ハイフン区切り・日本語URL不使用(`/services` ○ / `/サービス` ×)
- 404ページを用意(トップと問い合わせへの導線付き)

## 4. パフォーマンス基準(Core Web Vitals)

| 指標 | 目標 |
|---|---|
| LCP | 2.0s 以下 |
| CLS | 0.1 以下 |
| INP | 200ms 以下 |
| ページ総重量 | 初回表示 1MB 以下 |

### 実装ルール
- 画像: AVIF/WebP、`width`/`height` 属性必須(CLS対策)、ファーストビュー外は `loading="lazy"`
- Heroの主要画像は `fetchpriority="high"` + preload
- Webフォント: `font-display: swap` + 使用ウェイトのみ読み込み(Noto Sans JP はサブセット化 or `display=swap` のGoogle Fonts)
- JSは必要なページにのみ読み込む(全ページ共通バンドルを肥大化させない)

## 5. 計測

- {{Google Analytics 4 / 不要}} — 導入する場合は Cookie 同意の要否をユーザーに確認
- Google Search Console 登録手順を README に記載

## 6. リリース前チェックリスト

- [ ] 全ページの title / description が固有
- [ ] OGP画像が SNS デバッガーで正しく表示される
- [ ] sitemap.xml が生成され全ページを含む
- [ ] Lighthouse(モバイル)で全カテゴリ90+
- [ ] 404ページの動作確認
- [ ] `noindex` が本番で外れていること(ステージングには付けること)
