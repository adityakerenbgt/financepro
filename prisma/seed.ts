import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database (multi-user)...');

  // ---- Admin User: virgiangalang ----
  const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error('SEED_ADMIN_USERNAME dan SEED_ADMIN_PASSWORD wajib diisi di .env');
  }

  const hashedAdmin = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: { role: 'ADMIN' },
    create: {
      username: ADMIN_USERNAME,
      password: hashedAdmin,
      role: 'ADMIN',
      displayName: 'Virgian Galang',
    },
  });
  console.log(`✓ Admin user created: ${ADMIN_USERNAME} (id: ${admin.id})`);

  // ---- Admin Profile ----
  await prisma.userProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      name: 'Virgian Galang',
      currency: 'IDR',
      targetSavings: 5_000_000,
      targetExpense: 10_000_000,
    },
  });
  console.log('✓ Admin profile created');

  // ---- Categories (per user) ----
  const categoryDefs = [
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

  for (const cat of categoryDefs) {
    await prisma.category.upsert({
      where: { userId_name: { userId: admin.id, name: cat.name } },
      update: {},
      create: { userId: admin.id, ...cat },
    });
  }
  console.log(`✓ ${categoryDefs.length} categories created for admin`);

  // ---- Accounts ----
  const accountDefs = [
    { name: 'BCA', type: 'bank', balance: 5_000_000 },
    { name: 'Mandiri', type: 'bank', balance: 3_000_000 },
    { name: 'Tunai', type: 'cash', balance: 500_000 },
    { name: 'GoPay', type: 'ewallet', balance: 200_000 },
    { name: 'OVO', type: 'ewallet', balance: 150_000 },
    { name: 'BCA Credit Card', type: 'credit_card', balance: 0, isDebt: true },
    { name: 'Akulaku', type: 'paylater', balance: 0, isDebt: true },
  ];

  for (const acc of accountDefs) {
    await prisma.account.upsert({
      where: { userId_name: { userId: admin.id, name: acc.name } },
      update: {},
      create: { userId: admin.id, ...acc },
    });
  }
  console.log(`✓ ${accountDefs.length} accounts created`);

  // ---- Build lookup maps ----
  const catMap = new Map<string, string>();
  const accMap = new Map<string, string>();
  const allCats = await prisma.category.findMany({ where: { userId: admin.id } });
  const allAccs = await prisma.account.findMany({ where: { userId: admin.id } });
  allCats.forEach(c => catMap.set(c.name, c.id));
  allAccs.forEach(a => accMap.set(a.name, a.id));

  function getWeekStr(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `Minggu ${weekNum} ${date.getFullYear()}`;
  }
  function getMonthStr(date: Date): string {
    return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  }

  // ---- Sample Transactions ----
  const txData = [
    { date: new Date('2026-04-01'), cat: 'Gaji', desc: 'Gaji April 2026', acc: 'BCA', type: 'Pemasukan', amount: 12_000_000 },
    { date: new Date('2026-04-02'), cat: 'Makan & Minum', desc: 'Makan siang', acc: 'GoPay', type: 'Pengeluaran', amount: 45_000 },
    { date: new Date('2026-04-02'), cat: 'Transportasi', desc: 'Grab', acc: 'GoPay', type: 'Pengeluaran', amount: 25_000 },
    { date: new Date('2026-04-03'), cat: 'Belanja', desc: 'Supermarket', acc: 'BCA', type: 'Pengeluaran', amount: 350_000 },
    { date: new Date('2026-04-05'), cat: 'Tagihan', desc: 'Listrik PLN', acc: 'BCA', type: 'Pengeluaran', amount: 250_000 },
    { date: new Date('2026-04-05'), cat: 'Tagihan', desc: 'Internet Indihome', acc: 'BCA', type: 'Pengeluaran', amount: 350_000 },
    { date: new Date('2026-04-07'), cat: 'Makan & Minum', desc: 'Kopi weekend', acc: 'Tunai', type: 'Pengeluaran', amount: 65_000 },
    { date: new Date('2026-04-08'), cat: 'Cicilan', desc: 'Cicilan BCA Credit Card', acc: 'BCA', type: 'Pengeluaran', amount: 1_500_000 },
    { date: new Date('2026-04-10'), cat: 'Freelance', desc: 'Project website klien', acc: 'BCA', type: 'Pemasukan', amount: 3_000_000 },
    { date: new Date('2026-04-11'), cat: 'Kesehatan', desc: 'Vitamin & suplemen', acc: 'OVO', type: 'Pengeluaran', amount: 180_000 },
    { date: new Date('2026-04-12'), cat: 'Makan & Minum', desc: 'Makan malam keluarga', acc: 'Tunai', type: 'Pengeluaran', amount: 250_000 },
  ];

  let counter = 1;
  for (const tx of txData) {
    const dateStr = tx.date.toISOString().slice(0, 10).replace(/-/g, '');
    const txId = `TRX-${admin.id.slice(0, 6)}-${dateStr}-${String(counter).padStart(3, '0')}`;
    counter++;
    const catId = catMap.get(tx.cat);
    const accId = accMap.get(tx.acc);
    if (!catId || !accId) continue;
    await prisma.transaction.upsert({
      where: { txId },
      update: {},
      create: {
        txId, userId: admin.id, date: tx.date, categoryId: catId,
        description: tx.desc, accountId: accId, type: tx.type as any,
        amount: tx.amount, month: getMonthStr(tx.date), week: getWeekStr(tx.date),
      },
    });
  }
  console.log(`✓ ${txData.length} sample transactions created`);

  // ---- Sample Savings ----
  const savData = [
    { date: new Date('2026-04-03'), assetType: 'Investasi', instrumentName: 'BBCA', type: 'Buy', nominal: 2_000_000, pricePerUnit: 9500, acc: 'BCA' },
    { date: new Date('2026-04-05'), assetType: 'Dana Darurat', instrumentName: 'Dana Darurat BCA', type: 'Buy', nominal: 500_000, acc: 'BCA' },
    { date: new Date('2026-04-07'), assetType: 'Goals', instrumentName: 'Liburan Bali', type: 'Goals', nominal: 500_000, acc: 'Mandiri' },
  ];

  let invCounter = 1;
  for (const s of savData) {
    const dateStr = s.date.toISOString().slice(0, 10).replace(/-/g, '');
    const invId = `INV-${admin.id.slice(0, 6)}-${dateStr}-${String(invCounter).padStart(3, '0')}`;
    invCounter++;
    const accId = accMap.get(s.acc);
    if (!accId) continue;
    await prisma.savingsInvestment.upsert({
      where: { invId },
      update: {},
      create: {
        invId, userId: admin.id, date: s.date, assetType: s.assetType,
        instrumentName: s.instrumentName, transactionType: s.type as any,
        nominal: s.nominal, pricePerUnit: s.pricePerUnit || null,
        units: s.pricePerUnit ? s.nominal / s.pricePerUnit : null, accountId: accId,
      },
    });
  }
  console.log(`✓ ${savData.length} savings/investment records created`);

  // ---- Sample Debts ----
  await prisma.debt.upsert({
    where: { userId_debtName: { userId: admin.id, debtName: 'BCA Credit Card' } },
    update: {},
    create: { userId: admin.id, debtType: 'Revolving', debtName: 'BCA Credit Card', limitOrPrincipal: 15_000_000, interestRate: 2.25, status: 'Active' },
  });
  await prisma.debt.upsert({
    where: { userId_debtName: { userId: admin.id, debtName: 'Akulaku' } },
    update: {},
    create: { userId: admin.id, debtType: 'Revolving', debtName: 'Akulaku', limitOrPrincipal: 3_000_000, interestRate: 0, status: 'Active' },
  });
  console.log('✓ Sample debts created');

  // ---- Sample Assets ----
  await prisma.asset.upsert({
    where: { userId_instrumentName: { userId: admin.id, instrumentName: 'BBCA' } },
    update: {},
    create: { userId: admin.id, assetType: 'Investasi', instrumentName: 'BBCA', initialCapital: 0, currentValue: 2_100_000 },
  });
  await prisma.asset.upsert({
    where: { userId_instrumentName: { userId: admin.id, instrumentName: 'Dana Darurat BCA' } },
    update: {},
    create: { userId: admin.id, assetType: 'Dana Darurat', instrumentName: 'Dana Darurat BCA', initialCapital: 10_000_000, currentValue: 10_500_000 },
  });
  console.log('✓ Sample assets created');

  // ---- Sample Budget ----
  const month = 'Apr 2026';
  const budgetCats = [
    { cat: 'Makan & Minum', amount: 1_500_000 },
    { cat: 'Transportasi', amount: 500_000 },
    { cat: 'Belanja', amount: 1_000_000 },
    { cat: 'Tagihan', amount: 700_000 },
    { cat: 'Hiburan', amount: 300_000 },
    { cat: 'Kesehatan', amount: 400_000 },
  ];
  for (const b of budgetCats) {
    const catId = catMap.get(b.cat);
    if (!catId) continue;
    await prisma.budget.upsert({
      where: { userId_month_categoryId: { userId: admin.id, month, categoryId: catId } },
      update: {},
      create: { userId: admin.id, month, categoryId: catId, amount: b.amount },
    });
  }
  console.log(`✓ ${budgetCats.length} budget entries created`);

  // ---- Sample Goals ----
  await prisma.goal.upsert({
    where: { userId_goalName: { userId: admin.id, goalName: 'Liburan Bali' } },
    update: {},
    create: { userId: admin.id, goalName: 'Liburan Bali', targetAmount: 10_000_000, targetDate: new Date('2026-12-31'), status: 'OnTrack' },
  });
  await prisma.goal.upsert({
    where: { userId_goalName: { userId: admin.id, goalName: 'Dana Darurat 6 Bulan' } },
    update: {},
    create: { userId: admin.id, goalName: 'Dana Darurat 6 Bulan', targetAmount: 60_000_000, targetDate: new Date('2027-06-30'), status: 'OnTrack' },
  });
  console.log('✓ Sample goals created');

  console.log('\n✅ Database seeded successfully!');
  console.log(`   Admin: ${ADMIN_USERNAME}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
