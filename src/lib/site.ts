/** サイト全体で使う定数(表記統一のため一元管理) */
export const SITE = {
  companyName: 'maido&crafts strategy株式会社',
  companyNameEn: 'maido & crafts strategy',
  tagline: '人の成長が、価値を倍増させる。',
  mission:
    '成長の土台となるポータブルスキルを構築し、個人と組織の持続的な発展を促進することで、社会に貢献できる人材を輩出する',
  foundingDate: '2025-01',
  representative: '玉岡 諒太',
  address: '東京都台東区浅草1丁目13番5号 井門浅草すしや通りビルC43',
  email: 'support@ywc-maido.com',
  /** LINE公式アカウントに「個別相談」と送る導線(最重要CV) */
  lineUrl:
    'https://line.me/R/oaMessage/@798sqegp/?%E5%80%8B%E5%88%A5%E7%9B%B8%E8%AB%87',
} as const;

/** フッターに置く法的表記へのリンク */
export const LEGAL_NAV = [
  { href: '/privacy/', label: 'プライバシーポリシー' },
  { href: '/tokushoho/', label: '特定商取引法に基づく表記' },
] as const;

/** グローバルナビ(5項目以内 + CTA — 03_ux-guidelines §3) */
export const NAV = [
  { href: '/shindan/', label: '30秒診断' },
  { href: '/services/', label: 'サービス' },
  { href: '/about/', label: '会社案内' },
  { href: '/profile/', label: '代表プロフィール' },
  { href: '/news/', label: 'お知らせ' },
] as const;

/** 日付を「2026年8月27日」形式にする(04_copywriting-guide §4) */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
