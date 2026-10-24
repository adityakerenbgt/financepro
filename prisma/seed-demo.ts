// Seed akun demo terpisah berisi 50 transaksi + budget, goals, aset, tabungan contoh.
// Jalankan: npm run db:seed-demo  (idempoten: akun `demo` dibuat ulang tiap dijalankan)
// Password: DEMO_PASSWORD dari env, atau dibuat acak dan ditulis ke .demo-credentials.txt (di-gitignore).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { writeFileSync } from 'fs';
import { addDays, addMonths, format, subDays } from 'date-fns';
import { getMonthString, getWeekString } from '../lib/utils';

const prisma = new PrismaClient();
const USERNAME = 'demo';

// RNG deterministik agar hasilnya sama tiap dijalankan
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261024);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number, step = 1000) => Math.round((min + rand() * (max - min)) / step) * step;

type Tx = { date: Date; category: string; description: string; account: string; type: 'Pemasukan' | 'Pengeluaran'; amount: number; note?: string };

async function main() {
  const password = process.env.DEMO_PASSWORD || randomBytes(9).toString('base64url');
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  await prisma.user.deleteMany({ where: { username: USERNAME } }); // cascade menghapus semua data demo lama

  const user = await prisma.user.create({
    data: { username: USERNAME, password: await bcrypt.hash(password, 10), role: 'USER', plan: 'PRO', displayName: 'Akun Demo' },
  });
  await prisma.userProfile.create({ data: { userId: user.id, name: 'Akun Demo', currency: 'IDR', targetSavings: 5_000_000, targetExpense: 10_000_000 } });

  // ---- Kategori ----
  const catDefs: [string, 'income' | 'expense'][] = [
    ['Gaji', 'income'], ['Freelance', 'income'], ['Bonus', 'income'],
    ['Makan', 'expense'], ['Transport', 'expense'], ['Tagihan', 'expense'], ['Hiburan', 'expense'],
    ['Belanja', 'expense'], ['Kesehatan', 'expense'], ['Pendidikan', 'expense'],
  ];
  const cats: Record<string, string> = {};
  for (const [name, type] of catDefs) {
    cats[name] = (await prisma.category.create({ data: { userId: user.id, name, type } })).id;
  }

  // ---- Rekening (saldo awal, lalu disesuaikan oleh transaksi) ----
  const accDefs: [string, string, number][] = [['BCA', 'bank', 15_000_000], ['GoPay', 'ewallet', 400_000], ['Tunai', 'cash', 600_000]];
  const accs: Record<string, { id: string; balance: number }> = {};
  for (const [name, type, balance] of accDefs) {
    accs[name] = { id: (await prisma.account.create({ data: { userId: user.id, name, type, balance } })).id, balance };
  }

  // ---- 50 transaksi: 6 pemasukan + 44 pengeluaran dalam ~58 hari terakhir ----
  const txs: Tx[] = [];
  const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 12);
  const thisMonth1 = monthStart(today);
  const lastMonth1 = addMonths(thisMonth1, -1);
  const clamp = (d: Date) => (d > today ? today : d);

  txs.push({ date: clamp(lastMonth1), category: 'Gaji', description: 'Gaji bulanan', account: 'BCA', type: 'Pemasukan', amount: 12_000_000 });
  txs.push({ date: clamp(thisMonth1), category: 'Gaji', description: 'Gaji bulanan', account: 'BCA', type: 'Pemasukan', amount: 12_000_000 });
  txs.push({ date: clamp(addDays(lastMonth1, 13)), category: 'Freelance', description: 'Proyek desain logo', account: 'BCA', type: 'Pemasukan', amount: 2_500_000 });
  txs.push({ date: clamp(addDays(thisMonth1, 8)), category: 'Freelance', description: 'Proyek website landing', account: 'BCA', type: 'Pemasukan', amount: 3_200_000 });
  txs.push({ date: clamp(addDays(thisMonth1, 19)), category: 'Freelance', description: 'Jasa konsultasi', account: 'BCA', type: 'Pemasukan', amount: 1_500_000 });
  txs.push({ date: clamp(addDays(lastMonth1, 19)), category: 'Bonus', description: 'Bonus kinerja', account: 'BCA', type: 'Pemasukan', amount: 3_000_000 });

  const spend: { category: string; items: string[]; min: number; max: number; accounts: string[]; count: number }[] = [
    { category: 'Makan', items: ['Nasi goreng', 'Ayam geprek', 'Kopi susu', 'Makan siang kantor', 'Bakso', 'Sushi bareng teman', 'Sarapan bubur', 'Martabak'], min: 18_000, max: 140_000, accounts: ['GoPay', 'Tunai', 'BCA'], count: 14 },
    { category: 'Transport', items: ['Ojek online', 'Bensin motor', 'Parkir', 'Tiket KRL', 'Taksi online'], min: 10_000, max: 120_000, accounts: ['GoPay', 'Tunai'], count: 8 },
    { category: 'Tagihan', items: ['Listrik PLN', 'Internet rumah', 'Pulsa & paket data', 'Air PAM', 'Langganan streaming'], min: 55_000, max: 650_000, accounts: ['BCA'], count: 6 },
    { category: 'Hiburan', items: ['Nonton bioskop', 'Karaoke', 'Game top up', 'Konser mini', 'Langganan musik'], min: 45_000, max: 350_000, accounts: ['GoPay', 'BCA'], count: 5 },
    { category: 'Belanja', items: ['Belanja bulanan', 'Baju kerja', 'Sepatu', 'Peralatan rumah', 'Skincare'], min: 80_000, max: 650_000, accounts: ['BCA', 'GoPay'], count: 6 },
    { category: 'Kesehatan', items: ['Vitamin', 'Dokter umum', 'Obat flu'], min: 40_000, max: 300_000, accounts: ['BCA', 'Tunai'], count: 3 },
    { category: 'Pendidikan', items: ['Kursus online', 'Buku', 'Webinar'], min: 75_000, max: 450_000, accounts: ['BCA'], count: 2 },
  ];
  for (const s of spend) {
    for (let i = 0; i < s.count; i++) {
      txs.push({
        date: subDays(today, Math.floor(rand() * 58)),
        category: s.category,
        description: pick(s.items),
        account: pick(s.accounts),
        type: 'Pengeluaran',
        amount: between(s.min, s.max, 1000),
      });
    }
  }
  if (txs.length !== 50) throw new Error(`Jumlah transaksi ${txs.length}, seharusnya 50`);

  txs.sort((a, b) => a.date.getTime() - b.date.getTime());
  const perDay = new Map<string, number>();
  for (const t of txs) {
    const key = format(t.date, 'yyyyMMdd');
    const seq = (perDay.get(key) || 0) + 1;
    perDay.set(key, seq);
    await prisma.transaction.create({
      data: {
        txId: `DEMO-${key}-${String(seq).padStart(3, '0')}`,
        userId: user.id,
        date: t.date,
        categoryId: cats[t.category],
        description: t.description,
        accountId: accs[t.account].id,
        type: t.type,
        amount: t.amount,
        note: null,
        month: getMonthString(t.date),
        week: getWeekString(t.date),
      },
    });
    accs[t.account].balance += t.type === 'Pemasukan' ? t.amount : -t.amount;
  }

  // ---- Budget bulan berjalan ----
  const month = getMonthString(today);
  const budgets: [string, number][] = [['Makan', 2_500_000], ['Transport', 800_000], ['Hiburan', 600_000], ['Belanja', 1_200_000], ['Tagihan', 1_500_000]];
  for (const [category, amount] of budgets) {
    await prisma.budget.create({ data: { userId: user.id, month, categoryId: cats[category], amount } });
  }

  // ---- Goals + setoran goals ----
  const goals: [string, number, Date][] = [['Dana Darurat', 30_000_000, addMonths(today, 10)], ['Liburan Bali', 10_000_000, addMonths(today, 5)]];
  for (const [goalName, targetAmount, targetDate] of goals) {
    await prisma.goal.create({ data: { userId: user.id, goalName, targetAmount, targetDate } });
  }

  // ---- Aset ----
  const assets: [string, string, number, number][] = [
    ['Investasi', 'Reksa Dana Pasar Uang', 5_000_000, 5_420_000],
    ['Emas', 'Emas Antam 5 gr', 4_500_000, 5_150_000],
    ['Investasi', 'BBCA', 3_000_000, 3_380_000],
  ];
  for (const [assetType, instrumentName, initialCapital, currentValue] of assets) {
    await prisma.asset.create({ data: { userId: user.id, assetType, instrumentName, initialCapital, currentValue, startDate: subDays(today, 90) } });
  }

  // ---- Tabungan & investasi (mengurangi saldo BCA) ----
  const savings: { daysAgo: number; assetType: string; instrumentName: string; type: 'Buy' | 'Goals'; nominal: number }[] = [
    { daysAgo: 40, assetType: 'Investasi', instrumentName: 'Reksa Dana Pasar Uang', type: 'Buy', nominal: 500_000 },
    { daysAgo: 12, assetType: 'Investasi', instrumentName: 'Reksa Dana Pasar Uang', type: 'Buy', nominal: 500_000 },
    { daysAgo: 30, assetType: 'Dana Darurat', instrumentName: 'Dana Darurat', type: 'Goals', nominal: 2_000_000 },
    { daysAgo: 6, assetType: 'Dana Darurat', instrumentName: 'Dana Darurat', type: 'Goals', nominal: 2_000_000 },
    { daysAgo: 20, assetType: 'Tabungan', instrumentName: 'Liburan Bali', type: 'Goals', nominal: 1_500_000 },
  ];
  let invSeq = 0;
  for (const s of savings) {
    const date = subDays(today, s.daysAgo);
    invSeq++;
    await prisma.savingsInvestment.create({
      data: {
        invId: `DEMO-INV-${format(date, 'yyyyMMdd')}-${String(invSeq).padStart(3, '0')}`,
        userId: user.id, date, assetType: s.assetType, instrumentName: s.instrumentName,
        transactionType: s.type, nominal: s.nominal, accountId: accs['BCA'].id,
      },
    });
    accs['BCA'].balance -= s.nominal;
  }

  // ---- Hutang cicilan (Fixed) ----
  await prisma.debt.create({
    data: { userId: user.id, debtType: 'Fixed', debtName: 'Cicilan Motor', limitOrPrincipal: 18_000_000, interestRate: 8, tenor: 24, monthlyPayment: 850_000, startDate: subDays(today, 120) },
  });

  // ---- Saldo akhir rekening ----
  for (const a of Object.values(accs)) {
    await prisma.account.update({ where: { id: a.id }, data: { balance: a.balance } });
  }

  if (!process.env.DEMO_PASSWORD) {
    writeFileSync('.demo-credentials.txt', `username: ${USERNAME}\npassword: ${password}\n`, 'utf-8');
  }

  const income = txs.filter(t => t.type === 'Pemasukan').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'Pengeluaran').reduce((s, t) => s + t.amount, 0);
  console.log(`✓ Akun demo "${USERNAME}" siap: ${txs.length} transaksi (pemasukan Rp${income.toLocaleString('id-ID')}, pengeluaran Rp${expense.toLocaleString('id-ID')})`);
  console.log(process.env.DEMO_PASSWORD ? '  Password dari DEMO_PASSWORD.' : '  Kredensial ditulis ke .demo-credentials.txt');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
