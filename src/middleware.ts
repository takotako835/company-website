import { defineMiddleware } from 'astro:middleware';

// 静的サイトのときは render.yaml で付けていたヘッダを、SSR ではここで付与する
// (docs/05_tech-spec.md §5)
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  /*
   * キャッシュ制御(docs/05_tech-spec.md §5)。
   * HTML は毎回サーバーに確認させる(no-cache = 保存はするが、使う前に必ず問い合わせる)。
   * 更新が即座に届くことに加えて、次の2点で HTML のキャッシュは望ましくない:
   *   - A/Bテストの変種を訪問者ごとに割り当てている(キャッシュされると割り当てが固定される)
   *   - 管理画面はログイン状態で内容が変わる
   * 画像・CSS・JS はファイル名にハッシュが入っており、内容が変われば名前が変わるため、
   * 長期キャッシュのままでよい(それらは Node アダプタの静的配信が担当し、ここは通らない)。
   */
  const path = context.url.pathname;
  const isPrivate = path.startsWith('/admin') || path.startsWith('/api/');
  const contentType = response.headers.get('content-type') ?? '';

  if (isPrivate) {
    // 認証後の画面と API は、そもそも保存させない
    response.headers.set('Cache-Control', 'no-store');
  } else if (contentType.includes('text/html')) {
    response.headers.set('Cache-Control', 'no-cache');
  }

  return response;
});
