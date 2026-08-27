import type { APIRoute } from 'astro';

// Render のヘルスチェック用。生きていることだけを返す
export const GET: APIRoute = () =>
  new Response('ok', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
