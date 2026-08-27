/**
 * メールの送信(Resend)。
 *
 * 差出人は必ず自社ドメインの MAIL_FROM のままにし、問い合わせ者のアドレスは
 * reply_to に入れる。送信者を詐称した形(From に相手のアドレス)で送ると、
 * 迷惑メール扱いされて届かなくなるため。
 *
 * 送信の成否は必ず呼び出し元へ返す。黙って握りつぶさない。
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface MailConfig {
  apiKey: string;
  from: string;
  to: string;
}

/** 環境変数から送信設定を読む。1つでも欠けていたら null(=未設定)を返す */
export function readMailConfig(env: Record<string, string | undefined>): MailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.MAIL_FROM?.trim();
  const to = env.CONTACT_TO?.trim();
  if (!apiKey || !from || !to) return null;
  return { apiKey, from, to };
}

export type SendResult = { ok: true } | { ok: false; reason: string };

export async function sendMail(
  config: MailConfig,
  message: { subject: string; text: string; html: string; replyTo?: string },
  // 送信処理を差し替えられるようにしておく(テストで実際のAPIを叩かないため)
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  let res: Response;
  try {
    res = await fetchImpl(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      // reply_to は指定があるときだけ付ける(空で送ると差し戻される送信先がある)
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { ok: false, reason: '送信先に接続できませんでした' };
  }

  if (!res.ok) {
    // 本文に鍵や個人情報が載らないよう、状態コードだけを記録する
    console.error('メール送信の失敗:', res.status);
    return { ok: false, reason: `メールの送信を断られました(${res.status})` };
  }

  return { ok: true };
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] ?? c,
  );
}

export interface ContactInput {
  type: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}

/** サイトのお問い合わせフォームから届いた内容を、社内に知らせる文面 */
export function contactMail(input: ContactInput): {
  subject: string;
  text: string;
  html: string;
} {
  const rows: [string, string][] = [
    ['ご相談の種別', input.type],
    ['会社名', input.company],
    ['お名前', input.name],
    ['メールアドレス', input.email],
    ['電話番号', input.phone || '未記入'],
  ];

  return {
    subject: `サイトからお問い合わせ: ${input.name} 様(${input.type})`,
    text: [
      'ホームページのお問い合わせフォームから、お問い合わせが届きました。',
      '',
      ...rows.map(([label, value]) => `${label}: ${value}`),
      '',
      '──────────',
      input.message,
      '──────────',
      '',
      'このメールにそのまま返信すると、お問い合わせの方に届きます。',
    ].join('\n'),
    html: `
<div style="font-family:sans-serif;line-height:1.9;color:#1d1d1f;max-width:560px">
  <h2 style="font-size:18px;color:#1F3A5F;margin:0 0 16px">お問い合わせが届きました</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
    ${rows
      .map(
        ([label, value]) => `
    <tr>
      <th style="text-align:left;vertical-align:top;padding:8px 12px;background:#F5F5F7;color:#6e6e73;font-weight:700;width:34%;border-bottom:1px solid #D2D2D7">${escapeHtml(label)}</th>
      <td style="padding:8px 12px;border-bottom:1px solid #D2D2D7">${escapeHtml(value)}</td>
    </tr>`,
      )
      .join('')}
  </table>
  <div style="padding:14px 16px;background:#E8F0FA;border-radius:8px;white-space:pre-wrap">${escapeHtml(input.message)}</div>
  <p style="margin:18px 0 0;font-size:13px;color:#6e6e73">
    このメールにそのまま返信すると、お問い合わせの方に届きます。
  </p>
</div>`.trim(),
  };
}
