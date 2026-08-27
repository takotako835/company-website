// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// TODO: ドメイン未確定(brief §8)。既存 ywc-maido-okini.com を使うか新規取得か
// 確定したら site を本番URLに変更する(canonical / OGP / sitemap に反映される)
export default defineConfig({
  site: 'https://ywc-maido-okini.com',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
