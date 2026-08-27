import type { APIRoute } from 'astro';

// robots.txt は Sitemap の絶対URLを含むため、静的ファイルではなく site 設定から生成する
export const GET: APIRoute = ({ site }) => {
  const body = `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site)}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
