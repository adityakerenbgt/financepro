// Kategori bawaan untuk setiap user. Berkas murni (tanpa impor DB) agar bisa dipakai juga oleh prisma/seed.ts.
export const DEFAULT_CATEGORIES: { name: string; type: 'expense' | 'income' }[] = [
  { name: 'Makan & Minum', type: 'expense' },
  { name: 'Transportasi', type: 'expense' },
  { name: 'Belanja', type: 'expense' },
  { name: 'Hiburan', type: 'expense' },
  { name: 'Kesehatan', type: 'expense' },
  { name: 'Pendidikan', type: 'expense' },
  { name: 'Tagihan', type: 'expense' },
  { name: 'Cicilan', type: 'expense' },
  { name: 'Pembayaran Utang', type: 'expense' },
  { name: 'Lainnya', type: 'expense' },
  { name: 'Gaji', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Bonus', type: 'income' },
  { name: 'Investasi', type: 'income' },
  { name: 'Transfer Masuk', type: 'income' },
];
