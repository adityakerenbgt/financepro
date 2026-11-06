// Net Worth (kekayaan bersih). Fungsi murni, tanpa akses database, supaya mudah diuji.
//
//   netWorth = saldo rekening (BUKAN rekening kartu kredit/isDebt)
//            + nilai aset saat ini
//            + piutang yang belum tertagih
//            - hutang yang belum lunas
//
// Kenapa rekening isDebt tidak dijumlahkan: saldo rekening kartu kredit hanya turun saat belanja dan TIDAK naik saat
// tagihan dibayar (pembayaran dicatat dari rekening bank). Menjumlahkannya dan juga mengurangi hutang akan menghitung
// kartu dua kali, dan membayar hutang akan terlihat seperti menurunkan kekayaan.

export interface NetWorthAccount { balance: number; isDebt: boolean }
export interface NetWorthAsset { currentValue: number }
export interface NetWorthDebt {
  debtType: string; // 'Revolving' | 'Fixed'
  isPiutang?: boolean; // true = piutang (orang lain berhutang kepada user)
  totalSpent: number;
  totalPaid: number;
  remainingDebt: number;
}

export interface NetWorth {
  netWorth: number;
  cash: number; // saldo rekening non-kartu
  assets: number; // nilai aset saat ini
  receivables: number; // piutang belum tertagih
  liabilities: number; // hutang belum lunas
  excludedCardBalance: number; // saldo rekening kartu kredit yang sengaja tidak dihitung (informasi)
}

// Sisa kewajiban satu hutang. Kartu kredit (Revolving) = belanja - pembayaran; `remainingDebt` pada ringkasan
// hutang untuk Revolving bernilai (limit - dibayar), jadi tidak dipakai di sini.
export function outstandingLiability(d: NetWorthDebt): number {
  if (d.debtType === 'Revolving') return Math.max(d.totalSpent - d.totalPaid, 0);
  return Math.max(d.remainingDebt, 0);
}

export function computeNetWorth(accounts: NetWorthAccount[], assets: NetWorthAsset[], debts: NetWorthDebt[]): NetWorth {
  const cash = accounts.filter(a => !a.isDebt).reduce((s, a) => s + a.balance, 0);
  const excludedCardBalance = accounts.filter(a => a.isDebt).reduce((s, a) => s + a.balance, 0);
  const assetsValue = assets.reduce((s, a) => s + a.currentValue, 0);
  const receivables = debts.filter(d => d.isPiutang).reduce((s, d) => s + Math.max(d.remainingDebt, 0), 0);
  const liabilities = debts.filter(d => !d.isPiutang).reduce((s, d) => s + outstandingLiability(d), 0);
  return {
    netWorth: cash + assetsValue + receivables - liabilities,
    cash,
    assets: assetsValue,
    receivables,
    liabilities,
    excludedCardBalance,
  };
}
