import type { APIRoute } from 'astro';
import { contactMail, readMailConfig, sendMail, type ContactInput } from '../../lib/mail';

// クライアント側の検証は迂回できるため、サーバー側でも必ず検証する(05_tech-spec §4)
const LIMITS = {
  type: 120,
  company: 100,
  name: 100,
  email: 254,
  phone: 20,
  message: 2000,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 同じ送信元からの連投を抑える。インスタンス単位の簡易な歯止め */
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const recentPosts = new Map<string, number[]>();

function isRateLimited(key: string, now: number): boolean {
  const history = (recentPosts.get(key) ?? []).filter((at) => now - at < RATE_LIMIT.windowMs);
  history.push(now);
  recentPosts.set(key, history);

  // 古い記録を捨てて、メモリが際限なく増えないようにする
  if (recentPosts.size > 1000) {
    for (const [k, v] of recentPosts) {
      if (v.every((at) => now - at >= RATE_LIMIT.windowMs)) recentPosts.delete(k);
    }
  }
  return history.length > RATE_LIMIT.max;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function readField(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/** 問題があればエラー文言、なければ null */
function validate(input: ContactInput): string | null {
  for (const [key, max] of Object.entries(LIMITS)) {
    if (input[key as keyof ContactInput].length > max) {
      return '入力内容が長すぎます。';
    }
  }
  if (!input.type || !input.company || !input.name || !input.email || !input.message) {
    return '必須項目が入力されていません。';
  }
  if (!EMAIL_PATTERN.test(input.email)) return 'メールアドレスの形式が正しくありません。';
  if (input.message.length < 10) return 'ご相談内容は10文字以上でご入力ください。';
  return null;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // import.meta.env はビルド時に値が焼き込まれてしまうため、実行時の process.env を読む
  const config = readMailConfig(process.env);
  if (!config) {
    console.error('メール送信の設定(RESEND_API_KEY / MAIL_FROM / CONTACT_TO)が未設定です');
    return json({ error: 'ただいまフォームをご利用いただけません。' }, 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: '送信内容を読み取れませんでした。' }, 400);
  }

  // 自動投稿はダミー項目に値を入れる。受け付けたように見せて、何も送らない
  if (readField(form, '_gotcha') !== '') return json({ ok: true }, 200);

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = forwarded || clientAddress || 'unknown';
  if (isRateLimited(key, Date.now())) {
    return json({ error: '送信が続いています。しばらく時間をおいてお試しください。' }, 429);
  }

  const input: ContactInput = {
    type: readField(form, 'type'),
    company: readField(form, 'company'),
    name: readField(form, 'name'),
    email: readField(form, 'email'),
    phone: readField(form, 'phone'),
    message: readField(form, 'message'),
  };

  const invalid = validate(input);
  if (invalid) return json({ error: invalid }, 400);

  // 問い合わせ内容は個人情報を含むためログに出さない(05_tech-spec §4)
  const result = await sendMail(config, { ...contactMail(input), replyTo: input.email });
  if (!result.ok) {
    return json({ error: '送信に失敗しました。時間をおいてお試しください。' }, 502);
  }

  return json({ ok: true }, 200);
};
