// ============================================================
// Telegram Bot (grammY) — All command handlers
// Uses database via services layer instead of Google Sheets
// ============================================================

import { Bot, Context } from 'grammy';
import {
  createTransaction, getTransactions, createSavingsInvestment,
  getDebtSummaries, getAssetSummaries, getBudgetSummaries,
  getGoalSummaries, getDailyReport, getWeeklyReport,
  getMonthlyReport, getUserProfile,
} from './services';
import { formatCurrency, parseTransactionInput, parseSavingsInput } from './utils';
import prisma from './db';

// In-memory state for multi-step conversations
const userState = new Map<number, { command: string; data: Record<string, string> }>();

// Get the admin user ID (bot operates on behalf of admin)
async function getAdminUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  if (!admin) throw new Error('No admin user found');
  return admin.id;
}

export function createBot(): Bot {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

  const bot = new Bot(token);

  // ---- /start ----
  bot.command('start', async (ctx) => {
    let name = 'User';
    try { const uid = await getAdminUserId(); name = (await getUserProfile(uid)).name; } catch {}

    await ctx.reply(
      `🏦 *Selamat datang di FinancePro, ${escMd(name)}\\!*\n\n` +
      `Kelola keuangan pribadi Anda dengan mudah\\.\n\n` +
      `📋 *Menu Utama:*\n` +
      `/add \\- Tambah transaksi\n` +
      `/transaksi \\- Lihat transaksi terakhir\n` +
      `/nabung \\- Catat tabungan/investasi\n` +
      `/hutang \\- Ringkasan utang\n` +
      `/bayar \\- Bayar utang\n` +
      `/aset \\- Ringkasan aset\n` +
      `/budget \\- Budget vs aktual\n` +
      `/goals \\- Progress goals\n` +
      `/harian \\- Laporan harian\n` +
      `/mingguan \\- Laporan mingguan\n` +
      `/bulanan \\- Laporan bulanan\n` +
      `/dashboard \\- Buka dashboard web\n` +
      `/help \\- Semua perintah`,
      { parse_mode: 'MarkdownV2' }
    );
  });

  // ---- /help ----
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `📖 <b>Daftar Perintah FinancePro</b>\n\n` +
      `<b>💰 Transaksi:</b>\n` +
      `/add - Tambah transaksi baru\n` +
      `/transaksi - 10 transaksi terakhir\n` +
      `/templatetransaksi - Format input\n\n` +
      `<b>📈 Nabung & Investasi:</b>\n` +
      `/nabung - Catat tabungan/investasi\n` +
      `/investasi - Alias /nabung\n` +
      `/templateinvestasi - Format input\n\n` +
      `<b>💳 Utang:</b>\n` +
      `/hutang - Ringkasan utang\n` +
      `/bayar - Bayar utang\n\n` +
      `<b>📊 Lainnya:</b>\n` +
      `/aset - Ringkasan aset\n` +
      `/budget - Budget vs aktual\n` +
      `/goals - Progress goals\n\n` +
      `<b>📅 Laporan:</b>\n` +
      `/harian DD/MM/YYYY\n` +
      `/mingguan Minggu X YYYY | Minggu Y YYYY\n` +
      `/bulanan Feb 2026\n\n` +
      `/dashboard - Buka web dashboard`,
      { parse_mode: 'HTML' }
    );
  });

  // ---- /templatetransaksi ----
  bot.command('templatetransaksi', async (ctx) => {
    await ctx.reply(
      `📝 <b>Format Transaksi:</b>\n\n` +
      `<code>DD/MM/YYYY | Kategori | Deskripsi | Rekening | Jenis | Nominal | Catatan</code>\n\n` +
      `<b>Contoh:</b>\n` +
      `<code>02/02/2026 | Makan &amp; Minum | Nasi goreng | Tunai | Pengeluaran | 20000 | Makan siang</code>\n\n` +
      `Jenis: <i>Pemasukan</i> atau <i>Pengeluaran</i>\n` +
      `Catatan: opsional`,
      { parse_mode: 'HTML' }
    );
  });

  // ---- /templateinvestasi ----
  bot.command('templateinvestasi', async (ctx) => {
    await ctx.reply(
      `📝 <b>Format Nabung/Investasi:</b>\n\n` +
      `<code>DD/MM/YYYY | JenisAset | NamaInstrumen | Tipe | Nominal | HargaPerUnit | Rekening | Catatan</code>\n\n` +
      `<b>Contoh:</b>\n` +
      `<code>02/02/2026 | Investasi | Makmur RDPT | Buy | 1000000 | 1500 | BCA | Beli reksadana</code>\n\n` +
      `Tipe: Buy, Sell, Withdraw, Goals`,
      { parse_mode: 'HTML' }
    );
  });

  // ---- /add ----
  bot.command('add', async (ctx) => {
    const text = ctx.message?.text?.replace(/^\/add\s*/, '').trim();
    if (!text) {
      userState.set(ctx.from!.id, { command: 'add', data: {} });
      await ctx.reply(
        `📝 Kirim data transaksi:\n\n` +
        `<code>DD/MM/YYYY | Kategori | Deskripsi | Rekening | Jenis | Nominal | Catatan</code>\n\n` +
        `Atau ketik /templatetransaksi`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    await handleAddTransaction(ctx, text);
  });

  // ---- /transaksi ----
  bot.command('transaksi', handleShowTransactions);
  bot.command('transactions', handleShowTransactions);

  // ---- /nabung & /investasi ----
  bot.command('nabung', async (ctx) => {
    const text = ctx.message?.text?.replace(/^\/nabung\s*/, '').trim();
    if (!text) {
      userState.set(ctx.from!.id, { command: 'nabung', data: {} });
      await ctx.reply(`💰 Kirim data:\n<code>DD/MM/YYYY | JenisAset | Instrumen | Tipe | Nominal | HargaPerUnit | Rekening | Catatan</code>`, { parse_mode: 'HTML' });
      return;
    }
    await handleAddSavings(ctx, text);
  });

  bot.command('investasi', async (ctx) => {
    const text = ctx.message?.text?.replace(/^\/investasi\s*/, '').trim();
    if (!text) {
      userState.set(ctx.from!.id, { command: 'nabung', data: {} });
      await ctx.reply(`💰 Kirim data investasi:\n<code>DD/MM/YYYY | JenisAset | Instrumen | Tipe | Nominal | HargaPerUnit | Rekening | Catatan</code>`, { parse_mode: 'HTML' });
      return;
    }
    await handleAddSavings(ctx, text);
  });

  // ---- /hutang ----
  bot.command('hutang', async (ctx) => {
    try {
      const uid = await getAdminUserId();
      const debts = await getDebtSummaries(uid);
      if (debts.length === 0) { await ctx.reply('✅ Tidak ada data utang.'); return; }

      let msg = `💸 <b>Ringkasan Utang</b>\n\n`;
      let total = 0;
      debts.forEach((d, i) => {
        total += d.remainingDebt;
        const icon = d.status === 'Lunas' ? '✅' : d.status === 'Over Limit' ? '🔴' : '🟡';
        msg += `${i + 1}. <b>${d.debtName}</b> (${d.debtType})\n`;
        msg += `   Limit/Pokok: ${formatCurrency(d.limitOrPrincipal)}\n`;
        msg += `   Sisa: ${formatCurrency(d.remainingDebt)}\n`;
        msg += `   ${icon} ${d.status}\n\n`;
      });
      msg += `\n💰 <b>Total Sisa Utang: ${formatCurrency(total)}</b>`;
      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch { await ctx.reply('❌ Gagal mengambil data utang.'); }
  });

  // ---- /bayar ----
  bot.command('bayar', async (ctx) => {
    const text = ctx.message?.text?.replace(/^\/bayar\s*/, '').trim();
    if (!text) {
      await ctx.reply(
        `💳 Format bayar utang:\n<code>DD/MM/YYYY | Cicilan | NamaUtang | Rekening | Pengeluaran | Nominal</code>`,
        { parse_mode: 'HTML' }
      );
      userState.set(ctx.from!.id, { command: 'add', data: {} });
      return;
    }
    await handleAddTransaction(ctx, text);
  });

  // ---- /aset ----
  bot.command('aset', async (ctx) => {
    try {
      const uid = await getAdminUserId();
      const assets = await getAssetSummaries(uid);
      if (assets.length === 0) { await ctx.reply('📭 Belum ada data aset.'); return; }

      let msg = `💰 <b>Ringkasan Aset</b>\n\n`;
      let totalVal = 0, totalCap = 0;
      assets.forEach((a, i) => {
        totalVal += a.currentValue;
        totalCap += a.totalCapital;
        const icon = a.profitLoss >= 0 ? '📈' : '📉';
        msg += `${i + 1}. <b>${a.instrumentName}</b> (${a.assetType})\n`;
        msg += `   Modal: ${formatCurrency(a.totalCapital)}\n`;
        msg += `   Nilai: ${formatCurrency(a.currentValue)}\n`;
        msg += `   ${icon} P/L: ${formatCurrency(a.profitLoss)} (${a.returnPercentage.toFixed(1)}%)\n\n`;
      });
      msg += `📊 <b>Total Modal: ${formatCurrency(totalCap)}</b>\n`;
      msg += `<b>Total Nilai: ${formatCurrency(totalVal)}</b>\n`;
      msg += `<b>Total P/L: ${formatCurrency(totalVal - totalCap)}</b>`;
      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch { await ctx.reply('❌ Gagal mengambil data aset.'); }
  });

  // ---- /budget ----
  bot.command('budget', async (ctx) => {
    try {
      const uid = await getAdminUserId();
      const budgets = await getBudgetSummaries(uid);
      if (budgets.length === 0) { await ctx.reply('📭 Belum ada data budget.'); return; }

      let msg = `📊 <b>Budget vs Aktual</b>\n\n`;
      budgets.forEach(b => {
        const icon = b.status === 'Aman' ? '✅' : b.status === 'Hampir Over' ? '⚠️' : '🔴';
        msg += `${icon} <b>${b.category}</b> (${b.month})\n`;
        msg += `   Budget: ${formatCurrency(b.budgetAmount)}\n`;
        msg += `   Realisasi: ${formatCurrency(b.realisation)} (${b.percentage.toFixed(0)}%)\n`;
        msg += `   Selisih: ${formatCurrency(b.difference)}\n\n`;
      });
      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch { await ctx.reply('❌ Gagal mengambil data budget.'); }
  });

  // ---- /goals ----
  bot.command('goals', async (ctx) => {
    try {
      const uid = await getAdminUserId();
      const goals = await getGoalSummaries(uid);
      if (goals.length === 0) { await ctx.reply('📭 Belum ada goals.'); return; }

      let msg = `🎯 <b>Progress Goals</b>\n\n`;
      goals.forEach(g => {
        const icon = g.status === 'Tercapai' ? '✅' : g.status === 'Gagal' ? '❌' : '🔄';
        const bar = progressBar(g.progress);
        msg += `${icon} <b>${g.goalName}</b>\n`;
        msg += `   Target: ${formatCurrency(g.targetAmount)}\n`;
        msg += `   Terkumpul: ${formatCurrency(g.accumulatedAmount)}\n`;
        msg += `   ${bar} ${g.progress.toFixed(0)}%\n`;
        msg += `   Deadline: ${g.targetDate}\n\n`;
      });
      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch { await ctx.reply('❌ Gagal mengambil data goals.'); }
  });

  // ---- /harian ----
  bot.command('harian', async (ctx) => {
    const text = ctx.message?.text?.replace(/^\/harian\s*/, '').trim();
    if (!text) {
      userState.set(ctx.from!.id, { command: 'harian', data: {} });
      await ctx.reply('📅 Masukkan tanggal (DD/MM/YYYY):');
      return;
    }
    await handleDailyReport(ctx, text);
  });

  // ---- /mingguan ----
  bot.command('mingguan', async (ctx) => {
    const text = ctx.message?.text?.replace(/^\/mingguan\s*/, '').trim();
    if (!text) {
      userState.set(ctx.from!.id, { command: 'mingguan', data: {} });
      await ctx.reply('📆 Format: <code>Minggu X YYYY | Minggu Y YYYY</code>', { parse_mode: 'HTML' });
      return;
    }
    const parts = text.split('|').map(p => p.trim());
    if (parts.length >= 2) await handleWeeklyReport(ctx, parts[0], parts[1]);
    else await ctx.reply('❌ Format salah.');
  });

  // ---- /bulanan ----
  bot.command('bulanan', async (ctx) => {
    const text = ctx.message?.text?.replace(/^\/bulanan\s*/, '').trim();
    if (!text) {
      userState.set(ctx.from!.id, { command: 'bulanan', data: {} });
      await ctx.reply('🗓️ Masukkan bulan (contoh: <code>Feb 2026</code>):', { parse_mode: 'HTML' });
      return;
    }
    await handleMonthlyReportCmd(ctx, text);
  });

  // ---- /dashboard ----
  bot.command('dashboard', async (ctx) => {
    const url = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    await ctx.reply(`📈 <b>Dashboard FinancePro</b>\n\n${url}/dashboard`, { parse_mode: 'HTML' });
  });

  // ---- Handle plain text for multi-step commands ----
  bot.on('message:text', async (ctx) => {
    const state = userState.get(ctx.from!.id);
    if (!state) return;

    const text = ctx.message.text.trim();
    userState.delete(ctx.from!.id);

    switch (state.command) {
      case 'add': await handleAddTransaction(ctx, text); break;
      case 'nabung': await handleAddSavings(ctx, text); break;
      case 'harian': await handleDailyReport(ctx, text); break;
      case 'mingguan': {
        const parts = text.split('|').map(p => p.trim());
        if (parts.length >= 2) await handleWeeklyReport(ctx, parts[0], parts[1]);
        else await ctx.reply('❌ Format salah.');
        break;
      }
      case 'bulanan': await handleMonthlyReportCmd(ctx, text); break;
    }
  });

  return bot;
}

// ---- Command Handlers ----

async function handleAddTransaction(ctx: Context, text: string) {
  const parsed = parseTransactionInput(text);
  if (!parsed) {
    await ctx.reply('❌ Format salah. Ketik /templatetransaksi untuk contoh.');
    return;
  }
  try {
    const uid = await getAdminUserId();
    const tx = await createTransaction(uid, parsed);
    await ctx.reply(
      `✅ <b>Transaksi disimpan!</b>\n\n` +
      `🆔 ${tx.txId}\n` +
      `📅 ${parsed.date}\n` +
      `📂 ${parsed.category}\n` +
      `📝 ${parsed.description}\n` +
      `🏦 ${parsed.account}\n` +
      `${parsed.type === 'Pemasukan' ? '💰' : '💸'} ${parsed.type}: ${formatCurrency(parsed.amount)}`,
      { parse_mode: 'HTML' }
    );
  } catch (err) {
    console.error('Add transaction error:', err);
    await ctx.reply('❌ Gagal menyimpan. Coba lagi.');
  }
}

async function handleAddSavings(ctx: Context, text: string) {
  const parsed = parseSavingsInput(text);
  if (!parsed) {
    await ctx.reply('❌ Format salah. Ketik /templateinvestasi untuk contoh.');
    return;
  }
  try {
    const uid = await getAdminUserId();
    const item = await createSavingsInvestment(uid, parsed);
    await ctx.reply(
      `✅ <b>Nabung/Investasi dicatat!</b>\n\n` +
      `🆔 ${item.invId}\n` +
      `📂 ${parsed.assetType} — ${parsed.instrumentName}\n` +
      `📋 ${parsed.transactionType}\n` +
      `💰 ${formatCurrency(parsed.nominal)}`,
      { parse_mode: 'HTML' }
    );
  } catch (err) {
    console.error('Add savings error:', err);
    await ctx.reply('❌ Gagal menyimpan. Coba lagi.');
  }
}

async function handleShowTransactions(ctx: Context) {
  try {
    const uid = await getAdminUserId();
    const { transactions } = await getTransactions(uid, { limit: 10 });
    if (transactions.length === 0) { await ctx.reply('📭 Belum ada transaksi.'); return; }

    let msg = `📥 <b>10 Transaksi Terakhir</b>\n\n`;
    transactions.forEach((t, i) => {
      const icon = t.type === 'Pemasukan' ? '💰' : '💸';
      msg += `${i + 1}. ${icon} ${t.date.toLocaleDateString('id-ID')} — ${t.category.name}\n`;
      msg += `   ${t.description}: ${formatCurrency(t.amount)}\n`;
      msg += `   [${t.account.name}] <code>${t.txId}</code>\n\n`;
    });
    await ctx.reply(msg, { parse_mode: 'HTML' });
  } catch { await ctx.reply('❌ Gagal mengambil transaksi.'); }
}

async function handleDailyReport(ctx: Context, dateStr: string) {
  try {
    const uid = await getAdminUserId();
    const r = await getDailyReport(uid, dateStr);
    let msg = `📅 <b>Laporan Harian — ${r.date}</b>\n\n`;
    msg += `💰 Pemasukan: ${formatCurrency(r.totalIncome)}\n`;
    msg += `💸 Pengeluaran: ${formatCurrency(r.totalExpense)}\n`;
    msg += `📊 Saldo: ${formatCurrency(r.balance)}\n`;
    msg += `🔢 Transaksi: ${r.transactionCount}\n`;
    msg += `📈 Rata-rata: ${formatCurrency(r.averagePerTransaction)}\n`;
    msg += `🏆 Terbesar: ${r.largestCategory}\n`;
    msg += `📉 Terkecil: ${r.smallestCategory}\n\n`;

    if (r.transactions.length > 0) {
      msg += `<b>Daftar:</b>\n`;
      r.transactions.forEach((t, i) => {
        msg += `${i + 1}. ${t.type === 'Pemasukan' ? '💰' : '💸'} ${t.category} — ${t.description}: ${formatCurrency(t.amount)}\n`;
      });
    }
    await ctx.reply(msg, { parse_mode: 'HTML' });
  } catch { await ctx.reply('❌ Gagal membuat laporan.'); }
}

async function handleWeeklyReport(ctx: Context, w1: string, w2: string) {
  try {
    const uid = await getAdminUserId();
    const r = await getWeeklyReport(uid, w1, w2);
    const icon = r.difference > 0 ? '🔴' : r.difference < 0 ? '🟢' : '⚪';
    let msg = `📆 <b>Laporan Mingguan</b>\n${w1} vs ${w2}\n\n`;
    msg += `💸 ${w1}: ${formatCurrency(r.totalThis)}\n`;
    msg += `💸 ${w2}: ${formatCurrency(r.totalLast)}\n`;
    msg += `📊 Selisih: ${formatCurrency(r.difference)}\n`;
    msg += `${icon} ${r.trend}\n\n`;

    if (r.categories.length > 0) {
      msg += `<b>Per Kategori:</b>\n`;
      r.categories.forEach(c => {
        msg += `• ${c.category}: ${formatCurrency(c.thisWeek)} vs ${formatCurrency(c.lastWeek)} — ${c.changeLabel}\n`;
      });
    }
    await ctx.reply(msg, { parse_mode: 'HTML' });
  } catch { await ctx.reply('❌ Gagal membuat laporan.'); }
}

async function handleMonthlyReportCmd(ctx: Context, month: string) {
  try {
    const uid = await getAdminUserId();
    const r = await getMonthlyReport(uid, month);
    let msg = `🗓️ <b>Laporan Bulanan — ${month}</b>\n\n`;
    msg += `💰 Pemasukan: ${formatCurrency(r.income)}\n`;
    msg += `💸 Pengeluaran: ${formatCurrency(r.expense)}\n`;
    msg += `🏦 Tabungan: ${formatCurrency(r.savings)} (${r.savingsPercentage.toFixed(1)}%)\n`;
    msg += `📈 Investasi: ${formatCurrency(r.investment)}\n`;
    msg += `🎯 Goal: ${formatCurrency(r.goalSavings)}\n`;
    msg += `💳 Bayar Utang: ${formatCurrency(r.debtPayment)}\n\n`;

    if (r.categoryBreakdown.length > 0) {
      msg += `<b>Breakdown:</b>\n`;
      r.categoryBreakdown.forEach(c => {
        const pct = c.percentage > 0 ? ` (${c.percentage.toFixed(0)}%)` : '';
        msg += `• ${c.category}: ${formatCurrency(c.actual)}`;
        if (c.budget > 0) msg += ` / ${formatCurrency(c.budget)}${pct}`;
        msg += `\n`;
      });
    }
    await ctx.reply(msg, { parse_mode: 'HTML' });
  } catch { await ctx.reply('❌ Gagal membuat laporan.'); }
}

function progressBar(pct: number): string {
  const filled = Math.round(Math.min(pct, 100) / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function escMd(s: string): string {
  return s.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
