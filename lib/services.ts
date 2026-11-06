import prisma from './db';
import { TransactionType, SavingsType } from '@prisma/client';
import {
  parseDate, getMonthString, getWeekString, generateTxId, generateInvId,
  getBudgetStatus, getGoalStatus, formatDateISO,
} from './utils';
import type {
  TransactionInput, SavingsInput, DebtSummary, AssetSummary,
  BudgetSummary, GoalSummary, DashboardData,
} from '@/types';
import { startOfDay, endOfDay } from 'date-fns';
import { getOrCreateAccount } from './planLimits';
import { computeNetWorth, type NetWorth } from './netWorth';

// ============================================================
// TRANSACTIONS
// ============================================================

export async function createTransaction(userId: string, input: TransactionInput) {
  const date = parseDate(input.date);
  const month = getMonthString(date);
  const week = getWeekString(date);

  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const count = await prisma.transaction.count({ where: { userId, date: { gte: dayStart, lte: dayEnd } } });
  const txId = generateTxId(date, count + 1);

  let category = await prisma.category.findUnique({ where: { userId_name: { userId, name: input.category } } });
  if (!category) {
    category = await prisma.category.create({ data: { userId, name: input.category, type: input.type === 'Pemasukan' ? 'income' : 'expense' } });
  }

  const account = await getOrCreateAccount(userId, input.account);

  const tx = await prisma.transaction.create({
    data: { txId, userId, date, categoryId: category.id, description: input.description, accountId: account.id, type: input.type as TransactionType, amount: input.amount, note: input.note || null, month, week,
      recurringId: input.recurringId ?? null, recurringDate: input.recurringDate ? new Date(`${input.recurringDate}T00:00:00Z`) : null },
    include: { category: true, account: true },
  });

  const balanceChange = input.type === 'Pemasukan' ? input.amount : -input.amount;
  await prisma.account.update({ where: { id: account.id }, data: { balance: { increment: balanceChange } } });

  return tx;
}

export async function getTransactions(userId: string, filters?: {
  startDate?: string; endDate?: string; type?: string; category?: string; search?: string; limit?: number; offset?: number;
}) {
  const where: any = { userId };

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = parseDate(filters.startDate);
    if (filters.endDate) where.date.lte = endOfDay(parseDate(filters.endDate));
  }
  if (filters?.type) where.type = filters.type as TransactionType;
  if (filters?.category) where.category = { name: filters.category };
  if (filters?.search) where.description = { contains: filters.search, mode: 'insensitive' };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({ where, include: { category: true, account: true }, orderBy: { date: 'desc' }, take: filters?.limit || 25, skip: filters?.offset || 0 }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total };
}

// ============================================================
// SAVINGS & INVESTMENTS
// ============================================================

export async function createSavingsInvestment(userId: string, input: SavingsInput) {
  const date = parseDate(input.date);
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const count = await prisma.savingsInvestment.count({ where: { userId, date: { gte: dayStart, lte: dayEnd } } });
  const invId = generateInvId(date, count + 1);

  const account = await getOrCreateAccount(userId, input.account);

  const units = input.pricePerUnit ? input.nominal / input.pricePerUnit : null;

  return prisma.savingsInvestment.create({
    data: { invId, userId, date, assetType: input.assetType, instrumentName: input.instrumentName, transactionType: input.transactionType as SavingsType, nominal: input.nominal, pricePerUnit: input.pricePerUnit || null, units, accountId: account.id, notes: input.notes || null },
    include: { account: true },
  });
}

export async function getSavingsInvestments(userId: string, filters?: {
  startDate?: string; endDate?: string; type?: string; instrument?: string;
}) {
  const where: any = { userId };
  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = parseDate(filters.startDate);
    if (filters.endDate) where.date.lte = endOfDay(parseDate(filters.endDate));
  }
  if (filters?.type) where.transactionType = filters.type as SavingsType;
  if (filters?.instrument) where.instrumentName = filters.instrument;

  return prisma.savingsInvestment.findMany({ where, include: { account: true }, orderBy: { date: 'desc' } });
}

// ============================================================
// DEBTS
// ============================================================

export async function getDebtSummaries(userId: string): Promise<DebtSummary[]> {
  const debts = await prisma.debt.findMany({ where: { userId }, orderBy: { debtName: 'asc' } });

  const summaries: DebtSummary[] = [];

  for (const debt of debts) {
    let totalSpent = 0;
    let totalPaid = 0;

    if (debt.isPiutang) {
      totalSpent = debt.limitOrPrincipal;
      const receivedAgg = await prisma.transaction.aggregate({
        where: { userId, type: 'Pemasukan', category: { name: debt.debtName } },
        _sum: { amount: true },
      });
      totalPaid = receivedAgg._sum.amount || 0;
    } else if (debt.debtType === 'Revolving') {
      const account = await prisma.account.findUnique({ where: { userId_name: { userId, name: debt.debtName } } });
      if (account) {
        const spentAgg = await prisma.transaction.aggregate({ where: { userId, accountId: account.id, type: 'Pengeluaran' }, _sum: { amount: true } });
        totalSpent = spentAgg._sum.amount || 0;
      }
      const paidTxns = await prisma.transaction.findMany({
        where: { userId, type: 'Pengeluaran', description: { contains: debt.debtName }, category: { name: { in: ['Cicilan', 'Pembayaran Utang'] } } },
      });
      totalPaid = paidTxns.reduce((s, t) => s + t.amount, 0);
    } else {
      const paidTxns = await prisma.transaction.findMany({
        where: { userId, type: 'Pengeluaran', description: { contains: debt.debtName }, category: { name: { in: ['Cicilan', 'Pembayaran Utang'] } } },
      });
      totalPaid = paidTxns.reduce((s, t) => s + t.amount, 0);
      totalSpent = debt.limitOrPrincipal;
    }

    const remainingDebt = debt.limitOrPrincipal - totalPaid;
    const remainingLimit = debt.debtType === 'Revolving' && !debt.isPiutang
      ? debt.limitOrPrincipal - (totalSpent - totalPaid) : undefined;

    let status: string = 'Active';
    if (remainingDebt <= 0) status = 'Lunas';
    else if (debt.debtType === 'Revolving' && !debt.isPiutang && totalSpent > debt.limitOrPrincipal) status = 'Over Limit';

    summaries.push({ id: debt.id, debtType: debt.debtType, debtName: debt.debtName, limitOrPrincipal: debt.limitOrPrincipal, interestRate: debt.interestRate, totalSpent, totalPaid, remainingDebt: Math.max(remainingDebt, 0), remainingLimit, status, isPiutang: debt.isPiutang });
  }

  return summaries;
}

// ============================================================
// ASSETS
// ============================================================

export async function getAssetSummaries(userId: string): Promise<AssetSummary[]> {
  const assets = await prisma.asset.findMany({ where: { userId }, orderBy: { instrumentName: 'asc' } });

  const summaries: AssetSummary[] = [];

  for (const asset of assets) {
    const buys = await prisma.savingsInvestment.aggregate({ where: { userId, instrumentName: asset.instrumentName, transactionType: 'Buy' }, _sum: { nominal: true } });
    const sells = await prisma.savingsInvestment.aggregate({ where: { userId, instrumentName: asset.instrumentName, transactionType: 'Sell' }, _sum: { nominal: true } });

    const totalCapital = asset.initialCapital + (buys._sum.nominal || 0) - (sells._sum.nominal || 0);
    const profitLoss = asset.currentValue - totalCapital;
    const returnPct = totalCapital > 0 ? (profitLoss / totalCapital) * 100 : 0;

    summaries.push({ id: asset.id, assetType: asset.assetType, instrumentName: asset.instrumentName, initialCapital: asset.initialCapital, totalCapital, currentValue: asset.currentValue, profitLoss, returnPercentage: returnPct, lastUpdated: formatDateISO(asset.lastUpdated) });
  }

  return summaries;
}

// ============================================================
// BUDGET
// ============================================================

export async function getBudgetSummaries(userId: string, month?: string): Promise<BudgetSummary[]> {
  const where: any = { userId };
  if (month) where.month = month;

  const budgets = await prisma.budget.findMany({ where, include: { category: true }, orderBy: { category: { name: 'asc' } } });

  const summaries: BudgetSummary[] = [];

  for (const budget of budgets) {
    const txns = await prisma.transaction.aggregate({
      where: { userId, month: budget.month, categoryId: budget.categoryId, type: 'Pengeluaran' },
      _sum: { amount: true },
    });

    const realisation = txns._sum.amount || 0;
    const percentage = budget.amount > 0 ? (realisation / budget.amount) * 100 : 0;

    summaries.push({ id: budget.id, category: budget.category.name, month: budget.month, budgetAmount: budget.amount, realisation, difference: budget.amount - realisation, status: getBudgetStatus(percentage), percentage });
  }

  return summaries;
}

// ============================================================
// GOALS
// ============================================================

export async function getGoalSummaries(userId: string): Promise<GoalSummary[]> {
  const goals = await prisma.goal.findMany({ where: { userId }, orderBy: { goalName: 'asc' } });

  const summaries: GoalSummary[] = [];

  for (const goal of goals) {
    const accumulated = await prisma.savingsInvestment.aggregate({
      where: { userId, transactionType: 'Goals', instrumentName: goal.goalName },
      _sum: { nominal: true },
    });

    const accAmount = accumulated._sum.nominal || 0;
    const progress = goal.targetAmount > 0 ? (accAmount / goal.targetAmount) * 100 : 0;
    const status = getGoalStatus(progress, goal.targetDate);

    summaries.push({ id: goal.id, goalName: goal.goalName, targetAmount: goal.targetAmount, targetDate: formatDateISO(goal.targetDate), accumulatedAmount: accAmount, remaining: Math.max(goal.targetAmount - accAmount, 0), progress: Math.min(progress, 100), status });
  }

  return summaries;
}

// ============================================================
// REPORTS
// ============================================================

export async function getDailyReport(userId: string, dateStr: string) {
  const date = parseDate(dateStr);
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const txns = await prisma.transaction.findMany({ where: { userId, date: { gte: dayStart, lte: dayEnd } }, include: { category: true, account: true }, orderBy: { createdAt: 'asc' } });

  const income = txns.filter(t => t.type === 'Pemasukan').reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter(t => t.type === 'Pengeluaran');
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);

  const catMap = new Map<string, number>();
  expenses.forEach(t => catMap.set(t.category.name, (catMap.get(t.category.name) || 0) + t.amount));
  const sorted = [...catMap.entries()].sort((a, b) => b[1] - a[1]);

  return { date: formatDateISO(date), totalIncome: income, totalExpense, balance: income - totalExpense, transactionCount: txns.length, averagePerTransaction: expenses.length > 0 ? totalExpense / expenses.length : 0, largestCategory: sorted[0]?.[0] || '-', smallestCategory: sorted[sorted.length - 1]?.[0] || '-', transactions: txns.map(t => ({ id: t.id, txId: t.txId, category: t.category.name, description: t.description, account: t.account.name, type: t.type, amount: t.amount, note: t.note || undefined })) };
}

export async function getWeeklyReport(userId: string, thisWeek: string, lastWeek: string) {
  const txns = await prisma.transaction.findMany({ where: { userId, type: 'Pengeluaran', week: { in: [thisWeek, lastWeek] } }, include: { category: true } });

  const thisWeekTxns = txns.filter(t => t.week === thisWeek);
  const lastWeekTxns = txns.filter(t => t.week === lastWeek);

  const totalThis = thisWeekTxns.reduce((s, t) => s + t.amount, 0);
  const totalLast = lastWeekTxns.reduce((s, t) => s + t.amount, 0);
  const difference = totalThis - totalLast;
  const pctChange = totalLast > 0 ? ((totalThis - totalLast) / totalLast) * 100 : (totalThis > 0 ? 100 : 0);

  const allCats = new Set<string>();
  txns.forEach(t => allCats.add(t.category.name));

  const categories = [...allCats].map(cat => {
    const tw = thisWeekTxns.filter(t => t.category.name === cat).reduce((s, t) => s + t.amount, 0);
    const lw = lastWeekTxns.filter(t => t.category.name === cat).reduce((s, t) => s + t.amount, 0);
    const change = tw - lw;
    let changeLabel = lw === 0 && tw > 0 ? 'Baru' : tw === 0 && lw > 0 ? 'Hilang' : change > 0 ? `Naik ${((change / lw) * 100).toFixed(0)}%` : change < 0 ? `Turun ${((Math.abs(change) / lw) * 100).toFixed(0)}%` : 'Tetap';
    return { category: cat, thisWeek: tw, lastWeek: lw, change, changeLabel };
  });

  return { thisWeekLabel: thisWeek, lastWeekLabel: lastWeek, totalThis, totalLast, difference, percentageChange: pctChange, trend: difference > 0 ? `Naik ${pctChange.toFixed(0)}%` : difference < 0 ? `Turun ${Math.abs(pctChange).toFixed(0)}%` : 'Tetap', categories };
}

export async function getMonthlyReport(userId: string, month: string) {
  const txns = await prisma.transaction.findMany({ where: { userId, month }, include: { category: true, account: true }, orderBy: { date: 'asc' } });

  const income = txns.filter(t => t.type === 'Pemasukan').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'Pengeluaran').reduce((s, t) => s + t.amount, 0);

  const savings = await prisma.savingsInvestment.findMany({ where: { userId }, include: { account: true } });
  const monthSavings = savings.filter(s => getMonthString(s.date) === month);

  const investmentTotal = monthSavings.filter(s => s.transactionType === 'Buy').reduce((sum, s) => sum + s.nominal, 0);
  const goalSavingsTotal = monthSavings.filter(s => s.transactionType === 'Goals').reduce((sum, s) => sum + s.nominal, 0);
  const debtPayment = txns.filter(t => t.type === 'Pengeluaran' && ['Cicilan', 'Pembayaran Utang'].includes(t.category.name)).reduce((s, t) => s + t.amount, 0);

  const budgets = await getBudgetSummaries(userId, month);

  const expenseCats = new Set<string>();
  txns.filter(t => t.type === 'Pengeluaran').forEach(t => expenseCats.add(t.category.name));
  budgets.forEach(b => expenseCats.add(b.category));

  const categoryBreakdown = [...expenseCats].map(cat => {
    const actual = txns.filter(t => t.type === 'Pengeluaran' && t.category.name === cat).reduce((s, t) => s + t.amount, 0);
    const budget = budgets.find(b => b.category === cat)?.budgetAmount || 0;
    return { category: cat, budget, actual, percentage: budget > 0 ? (actual / budget) * 100 : 0 };
  });

  const savingsAmount = income - expense;
  return { month, income, expense, savings: savingsAmount, savingsPercentage: income > 0 ? (savingsAmount / income) * 100 : 0, investment: investmentTotal, goalSavings: goalSavingsTotal, debtPayment, newDebt: 0, beginningBalance: 0, endingBalance: savingsAmount, transactions: txns.map(t => ({ id: t.id, txId: t.txId, date: formatDateISO(t.date), category: t.category.name, description: t.description, account: t.account.name, type: t.type, amount: t.amount, source: 'Transaksi' })), categoryBreakdown };
}

// ============================================================
// DASHBOARD DATA
// ============================================================

// Net Worth saat ini (titik waktu "sekarang"; tidak mengikuti filter tanggal). Lihat lib/netWorth.ts untuk rumus.
export async function getNetWorth(userId: string): Promise<NetWorth> {
  const [accounts, assets, debts] = await Promise.all([
    prisma.account.findMany({ where: { userId }, select: { balance: true, isDebt: true } }),
    prisma.asset.findMany({ where: { userId }, select: { currentValue: true } }),
    getDebtSummaries(userId),
  ]);
  return computeNetWorth(accounts, assets, debts);
}

export async function getDashboardData(userId: string, startDate?: string, endDate?: string, opts: { includeNetWorth?: boolean } = {}): Promise<DashboardData> {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = parseDate(startDate);
  if (endDate) dateFilter.lte = endOfDay(parseDate(endDate));
  const hasDateFilter = startDate || endDate;

  const txWhere: any = { userId };
  if (hasDateFilter) txWhere.date = dateFilter;

  const [txns, savingsItems, debts, assets, budgets, goals, accountRows] = await Promise.all([
    prisma.transaction.findMany({ where: txWhere, include: { category: true }, orderBy: { date: 'asc' } }),
    prisma.savingsInvestment.findMany({ where: hasDateFilter ? { userId, date: dateFilter } : { userId } }),
    getDebtSummaries(userId),
    getAssetSummaries(userId),
    getBudgetSummaries(userId),
    getGoalSummaries(userId),
    opts.includeNetWorth === false ? Promise.resolve([]) : prisma.account.findMany({ where: { userId }, select: { balance: true, isDebt: true } }),
  ]);

  const totalIncome = txns.filter(t => t.type === 'Pemasukan').reduce((s, t) => s + t.amount, 0);
  const totalExpense = txns.filter(t => t.type === 'Pengeluaran').reduce((s, t) => s + t.amount, 0);
  const totalSavings = savingsItems.filter(s => s.transactionType === 'Goals' || s.transactionType === 'Buy').reduce((s, i) => s + i.nominal, 0);
  const newDebt = debts.reduce((s, d) => s + d.totalSpent, 0);
  const budgetRealisation = budgets.length > 0 ? budgets.reduce((s, b) => s + b.percentage, 0) / budgets.length : 0;

  const monthMap = new Map<string, { income: number; expense: number }>();
  txns.forEach(t => {
    const m = t.month;
    const entry = monthMap.get(m) || { income: 0, expense: 0 };
    if (t.type === 'Pemasukan') entry.income += t.amount; else entry.expense += t.amount;
    monthMap.set(m, entry);
  });
  const moneyFlow = [...monthMap.entries()].map(([period, d]) => ({ period, ...d }));

  const catSpend = new Map<string, number>();
  txns.filter(t => t.type === 'Pengeluaran').forEach(t => catSpend.set(t.category.name, (catSpend.get(t.category.name) || 0) + t.amount));
  const spendingOverview = [...catSpend.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([category, amount]) => ({ category, amount }));

  const expensesSummary = budgets.map(b => ({ category: b.category, budget: b.budgetAmount, actual: b.realisation, percentage: b.percentage }));

  const assetAlloc = new Map<string, number>();
  assets.forEach(a => assetAlloc.set(a.assetType, (assetAlloc.get(a.assetType) || 0) + a.currentValue));
  const investmentSummary = [...assetAlloc.entries()].map(([assetType, value]) => ({ assetType, value }));

  const goalsProgress = goals.map(g => ({ name: g.goalName, target: g.targetAmount, current: g.accumulatedAmount, progress: g.progress }));

  const tips: string[] = [];
  if (totalExpense > totalIncome * 0.8 && totalIncome > 0) tips.push('⚠️ Pengeluaran melebihi 80% dari pemasukan.');
  if (totalExpense > totalIncome && totalIncome > 0) tips.push('🚨 Pengeluaran melebihi pemasukan! Anda mengalami defisit.');
  budgets.forEach(b => { if (b.percentage > 100) tips.push(`📊 Kategori "${b.category}" sudah over budget.`); else if (b.percentage > 80) tips.push(`⚡ Kategori "${b.category}" hampir over budget.`); });
  goals.forEach(g => { if (g.status === 'Gagal') tips.push(`❌ Goal "${g.goalName}" sudah melewati deadline.`); else if (g.progress > 75) tips.push(`✅ Goal "${g.goalName}" hampir tercapai!`); });
  if (tips.length === 0) tips.push('👍 Keuangan Anda dalam kondisi baik. Pertahankan!');

  // Net Worth memakai ringkasan hutang & aset yang sudah diambil di atas (tanpa query ulang). Dilewati bila tidak berhak (FREE).
  const netWorth = opts.includeNetWorth === false ? null : computeNetWorth(accountRows, assets, debts);

  return { kpi: { totalIncome, totalExpense, totalSavings, newDebt, accountTurnover: totalIncome + totalExpense, budgetRealisation }, moneyFlow, spendingOverview, expensesSummary, investmentSummary, goalsProgress, tips, netWorth };
}

// ============================================================
// HELPERS
// ============================================================

export async function getCategories(userId: string) {
  return prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } });
}

export async function getAccounts(userId: string) {
  return prisma.account.findMany({ where: { userId }, orderBy: { name: 'asc' } });
}

export async function getUserProfile(userId: string) {
  let profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.userProfile.create({ data: { userId, name: 'User' } });
  }
  return profile;
}
