// Sumber tunggal harga & daftar fitur paket. Dipakai landing page (/) dan halaman upgrade.

export const PRICING = {
  proMonthly: 29_000,
  proYearly: 249_000,
} as const;

// Hemat dibanding 12x bulanan (dibulatkan)
export const YEARLY_SAVING_PERCENT = Math.round((1 - PRICING.proYearly / (PRICING.proMonthly * 12)) * 100);
export const YEARLY_PER_MONTH = Math.round(PRICING.proYearly / 12);

export const FREE_FEATURES = [
  'Catat transaksi (unlimited)',
  'Dashboard bulan berjalan',
  '1 rekening',
  'Laporan bulanan sederhana',
  'Telegram bot (add & view transaksi)',
];

export const PRO_FEATURES = [
  'Semua fitur FREE',
  'Rekening tak terbatas',
  'Laporan harian, mingguan, bulanan lengkap',
  'Nabung & Investasi tracker',
  'Hutang & Piutang management',
  'Aset portfolio',
  'Goals & target keuangan',
  'Budget planning & monitoring',
  'History tak terbatas',
  'Semua fitur Telegram bot',
];

export function formatRupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString('id-ID')}`;
}
