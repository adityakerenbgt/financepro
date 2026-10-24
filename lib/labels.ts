// Label tampilan untuk nilai yang disimpan dalam Bahasa Indonesia di database. Nilai tersimpan tidak berubah.
const ASSET_TYPE_EN: Record<string, string> = {
  'Investasi': 'Investment',
  'Dana Darurat': 'Emergency Fund',
  'Tabungan': 'Savings',
  'Properti': 'Property',
  'Kendaraan': 'Vehicle',
  'Emas': 'Gold',
  'Crypto': 'Crypto',
  'Lainnya': 'Other',
};

export function assetTypeLabel(value: string, lang: 'id' | 'en'): string {
  return lang === 'en' ? ASSET_TYPE_EN[value] ?? value : value;
}

const ACCOUNT_TYPE_LABELS: Record<string, { id: string; en: string }> = {
  bank: { id: 'Bank', en: 'Bank' },
  cash: { id: 'Tunai', en: 'Cash' },
  ewallet: { id: 'E-Wallet', en: 'E-Wallet' },
  credit_card: { id: 'Kartu Kredit', en: 'Credit Card' },
  paylater: { id: 'Paylater', en: 'Paylater' },
};

export function accountTypeLabel(value: string, lang: 'id' | 'en'): string {
  return ACCOUNT_TYPE_LABELS[value]?.[lang] ?? value;
}

// Tips keuangan dibuat di server dalam Bahasa Indonesia (lib/services.ts); diterjemahkan untuk tampilan.
const TIP_PATTERNS: [RegExp, string][] = [
  [/^⚠️ Pengeluaran melebihi 80% dari pemasukan\.$/, '⚠️ Spending exceeds 80% of income.'],
  [/^🚨 Pengeluaran melebihi pemasukan! Anda mengalami defisit\.$/, '🚨 Spending exceeds income! You are running a deficit.'],
  [/^📊 Kategori "(.+)" sudah over budget\.$/, '📊 Category "$1" is over budget.'],
  [/^⚡ Kategori "(.+)" hampir over budget\.$/, '⚡ Category "$1" is almost over budget.'],
  [/^❌ Goal "(.+)" sudah melewati deadline\.$/, '❌ Goal "$1" has passed its deadline.'],
  [/^✅ Goal "(.+)" hampir tercapai!$/, '✅ Goal "$1" is almost achieved!'],
  [/^👍 Keuangan Anda dalam kondisi baik\. Pertahankan!$/, '👍 Your finances are in good shape. Keep it up!'],
];

export function translateTip(tip: string, lang: 'id' | 'en'): string {
  if (lang !== 'en') return tip;
  for (const [re, en] of TIP_PATTERNS) {
    if (re.test(tip)) return tip.replace(re, en);
  }
  return tip;
}
