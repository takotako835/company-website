// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import { readdirSync, readFileSync } from 'node:fs';

// 公開URLは環境変数で切り替える(canonical / OGP / sitemap / robots.txt に反映される)。
// Render では render.yaml の SITE_URL、独自ドメイン取得後はその値を書き換えるだけでよい。
// TODO: 独自ドメインが確定したら DEFAULT_SITE_URL も本番ドメインに更新する(brief §8)
const DEFAULT_SITE_URL = 'https://maido-crafts-website.onrender.com';
const site = process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || DEFAULT_SITE_URL;

/**
 * お知らせ記事のURL一覧。
 * SSR では動的ルート(/news/[slug])を sitemap 側が列挙できないため、
 * 記事ファイルから組み立てて明示的に渡す。下書きは除く。
 */
function newsUrls() {
  return readdirSync('./src/content/news')
    .filter((file) => file.endsWith('.md'))
    .filter((file) => {
      const frontmatter = readFileSync(`./src/content/news/${file}`, 'utf8').split('---')[1] ?? '';
      return !/^\s*draft:\s*true\s*$/m.test(frontmatter);
    })
    .map((file) => new URL(`/news/${file.replace(/\.md$/, '')}/`, site).toString());
}

export default defineConfig({
  site,
  security: {
    // Astro は「信頼するホスト名」を明示しないと Host / X-Forwarded-Host を無視し、
    // リクエストURLのホストを localhost として扱う。その結果、フォーム送信の
    // Origin チェックが必ず不一致になり 403 になるため、公開先を許可しておく。
    // (Render はリバースプロキシ経由なので X-Forwarded-* の信頼が必須)
    allowedDomains: [
      { hostname: new URL(site).hostname },
      // 手元の開発サーバー
      { hostname: 'localhost' },
      { hostname: '127.0.0.1' },
    ],
  },
  // 問い合わせフォームのメール送信(Resend)にサーバーが要るため SSR で動かす。
  // 全ページをサーバー側でレンダリングすることで、middleware のセキュリティヘッダが
  // すべてのページに適用される(静的書き出しだと middleware を通らない)
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // 送信完了ページは検索結果に出す必要がないため sitemap から除外する
  integrations: [
    sitemap({
      customPages: newsUrls(),
      filter: (page) =>
        !page.includes('/contact/thanks') &&
        !page.includes('/api/') &&
        !page.includes('/healthz'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
