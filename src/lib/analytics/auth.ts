/**
 * 管理画面の認証。
 * ADMIN_PASSWORD(環境変数)で入り、署名つきCookieで7日間保持する。
 * パスワード未設定のあいだ管理画面は開けない(安全側に倒す)
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'admin_session';
const SESSION_DAYS = 7;

function secret(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  return password ? `admin-v1|${password}` : null;
}

function sign(expiresAt: number, key: string): string {
  return createHmac('sha256', key).update(String(expiresAt)).digest('hex');
}

export function createSessionCookie(): string | null {
  const key = secret();
  if (!key) return null;
  const expiresAt = Date.now() + SESSION_DAYS * 86400000;
  const value = `${expiresAt}.${sign(expiresAt, key)}`;
  return `${COOKIE_NAME}=${value}; Path=/admin; HttpOnly; SameSite=Strict; Secure; Max-Age=${SESSION_DAYS * 86400}`;
}

export function isAuthenticated(cookieHeader: string | null): boolean {
  const key = secret();
  if (!key || !cookieHeader) return false;
  const raw = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!raw) return false;
  const [expiresPart, signature] = raw.split('.');
  const expiresAt = Number(expiresPart);
  if (!expiresAt || !signature || expiresAt < Date.now()) return false;
  const expected = sign(expiresAt, key);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function checkPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password || !input) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(password);
  return a.length === b.length && timingSafeEqual(a, b);
}
