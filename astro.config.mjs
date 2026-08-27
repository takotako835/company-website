// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// 公開URLは環境変数で切り替える(canonical / OGP / sitemap / robots.txt に反映される)。
// Render では render.yaml の SITE_URL、独自ドメイン取得後はその値を書き換えるだけでよい。
// TODO: 独自ドメインが確定したら DEFAULT_SITE_URL も本番ドメインに更新する(brief §8)
const DEFAULT_SITE_URL = 'https://maido-crafts-website.onrender.com';
const site = process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || DEFAULT_SITE_URL;

export default defineConfig({
  site,
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
