import { defineMiddleware } from 'astro:middleware';

// 静的サイトのときは render.yaml で付けていたヘッダを、SSR ではここで付与する
// (docs/05_tech-spec.md §5)
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return response;
});
