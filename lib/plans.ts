// Sumber tunggal harga & daftar fitur paket. Dipakai landing page (/) dan halaman upgrade.

export const PRICING = {
  proMonthly: 29_000,
  proYearly: 249_000,
} as const;

// Hemat dibanding 12x bulanan (dibulatkan)
export const YEARLY_SAVING_PERCENT = Math.round((1 - PRICING.proYearly / (PRICING.proMonthly * 12)) * 100);
export const YEARLY_PER_MONTH = Math.round(PRICING.proYearly / 12);

// Pasangan [Indonesia, English]
export const FREE_FEATURES_I18N: [string, string][] = [
  ['Catat transaksi (unlimited)', 'Unlimited transaction logging'],
  ['Dashboard bulan berjalan', 'Current-month dashboard'],
  ['1 rekening', '1 account'],
  ['Laporan bulanan sederhana', 'Basic monthly report'],
  ['Telegram bot (add & view transaksi)', 'Telegram bot (add & view transactions)'],
];

export const PRO_FEATURES_I18N: [string, string][] = [
  ['Semua fitur FREE', 'Everything in FREE'],
  ['Rekening tak terbatas', 'Unlimited accounts'],
  ['Laporan harian, mingguan, bulanan lengkap', 'Full daily, weekly & monthly reports'],
  ['Nabung & Investasi tracker', 'Savings & investment tracker'],
  ['Hutang & Piutang management', 'Debt & receivables management'],
  ['Aset portfolio', 'Asset portfolio'],
  ['Goals & target keuangan', 'Goals & financial targets'],
  ['Budget planning & monitoring', 'Budget planning & monitoring'],
  ['History tak terbatas', 'Unlimited history'],
  ['Semua fitur Telegram bot', 'Full Telegram bot features'],
];

export const FREE_FEATURES = FREE_FEATURES_I18N.map(([id]) => id);
export const PRO_FEATURES = PRO_FEATURES_I18N.map(([id]) => id);

export function formatRupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString('id-ID')}`;
}
