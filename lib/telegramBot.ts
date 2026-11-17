// ============================================================
// Bot Telegram (grammY) — multi-user & aman (T-BOT-1)
//
// Prinsip:
// - bot hanya melayani CHAT PRIBADI yang sudah ditautkan ke sebuah akun (kode 6 digit dari Pengaturan, /link KODE).
//   Setiap perintah memuat user dari chatId; chat asing dihentikan sebelum menyentuh data apa pun.
// - perintah PRO ditolak untuk akun FREE (plan efektif dari database).
// - status percakapan multi-langkah disimpan di database (bukan memori), kedaluwarsa 10 menit.
// - semua masukan divalidasi (parser Rupiah bulat, tanggal) sebelum menyentuh database; semua teks dinamis di-escape.
// ============================================================

import { Bot, Context, type Transformer } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import {
  createTransaction, getTransactions, createSavingsInvestment,
  getDebtSummaries, getAssetSummaries, getBudgetSummaries,
  getGoalSummaries, getDailyReport, getWeeklyReport,
  getMonthlyReport,
} from './services';
import { formatCurrency } from './utils';
import { getEffectivePlan } from './plan';
import { PlanLimitError } from './planLimits';
import { rateLimit } from './rateLimit';
import { todayWib } from './recurring';
import { parseImportDate, parseRupiah, validateRow, type RawRow } from './importParsing';
import prisma from './db';
import { EntryParseError, normalizeChatEntry, parseChatHeuristic, type ChatEntry, type EntryContext } from './chatEntry';
import {
  MAX_IMAGE_BYTES, getReceiptProvider, normalizeReceipt, readEntryWithLLM, readReceiptWithActiveProvider, sniffImageMime,
} from './receipt';
import {
  activePending, claimPending, clearPending, consumeLinkCode, getUserByChat, setPending, unlinkByChat, type LinkedUser,
} from './telegramLink';

export type BotCtx = Context & { fp?: LinkedUser };

export interface BotOptions {
  token?: string;
  botInfo?: UserFromGetMe; // bila diberikan, bot tidak memanggil getMe (dipakai pengujian)
  transformer?: Transformer; // mencegat panggilan API Telegram (dipakai pengujian)
  apiRoot?: string; // alamat API Telegram (hanya pengujian; unduhan foto memakai alamat ini)
}

// Perintah yang boleh dipakai paket FREE (sesuai halaman harga: tambah & lihat transaksi). Sisanya khusus PRO.
const PRO_ONLY = new Set(['nabung', 'investasi', 'hutang', 'bayar', 'aset', 'budget', 'goals', 'harian', 'mingguan', 'bulanan']);
// Perintah yang boleh dipakai sebelum chat tertaut.
const OPEN_COMMANDS = new Set(['start', 'help', 'link']);

const h = (v: string | number): string => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const baseUrl = () => (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const HTML = { parse_mode: 'HTML' as const };

const NOT_LINKED =
  `🔐 <b>Akun belum terhubung.</b>\n\n` +
  `1. Buka FinancePro → <b>Pengaturan → Hubungkan Telegram</b>\n` +
  `2. Salin kode 6 digit yang muncul\n` +
  `3. Kirim di sini: <code>/link KODE</code>\n\n` +
  `Kode berlaku 10 menit.`;

const UPGRADE = () =>
  `🔒 Perintah ini khusus paket <b>PRO</b>.\nUpgrade: ${baseUrl()}/dashboard/upgrade`;

function parseCommand(text: string): { cmd: string; args: string } | null {
  const m = text.match(/^\/([A-Za-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  return m ? { cmd: m[1].toLowerCase(), args: (m[2] ?? '').trim() } : null;
}

export function createBot(opts: BotOptions = {}): Bot<BotCtx> {
  const token = opts.token ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

  const apiRoot = (opts.apiRoot ?? 'https://api.telegram.org').replace(/\/+$/, '');
  const bot = new Bot<BotCtx>(token, { ...(opts.botInfo ? { botInfo: opts.botInfo } : {}), ...(opts.apiRoot ? { client: { apiRoot } } : {}) });
  if (opts.transformer) bot.api.config.use(opts.transformer);

  // ---------- Gerbang: hanya chat pribadi, tertaut, dan sesuai paket ----------
  bot.use(async (ctx, next) => {
    const chat = ctx.chat;
    if (!chat || chat.type !== 'private') return; // grup, channel, dll. diabaikan sepenuhnya
    const chatId = String(chat.id);

    const rl = await rateLimit('tg', chatId, 40, 60);
    if (!rl.success) return;

    const text = ctx.message?.text;
    const parsed = text ? parseCommand(text) : null;
    if (parsed && OPEN_COMMANDS.has(parsed.cmd)) return next();

    const user = await getUserByChat(chatId);
    if (!user) {
      if (parsed) await ctx.reply(NOT_LINKED, HTML); // teks biasa dari chat asing diabaikan
      return;
    }

    const isPro = getEffectivePlan(user) === 'PRO';
    if (parsed) {
      if (PRO_ONLY.has(parsed.cmd) && !isPro) { await ctx.reply(UPGRADE(), HTML); return; }
    } else if (text) {
      const pending = activePending(user);
      if (pending && PRO_ONLY.has(pending) && !isPro) { await clearPending(user.id); await ctx.reply(UPGRADE(), HTML); return; }
    }

    ctx.fp = user;
    return next();
  });

  // ---------- /start & /help (boleh sebelum tertaut) ----------
  bot.command('start', async (ctx) => {
    const user = await getUserByChat(String(ctx.chat.id));
    if (!user) {
      await ctx.reply(`🏦 <b>Selamat datang di FinancePro!</b>\n\n${NOT_LINKED}`, HTML);
      return;
    }
    await ctx.reply(`🏦 <b>Halo, ${h(user.displayName || user.username)}!</b>\n\n${helpText(getEffectivePlan(user) === 'PRO')}`, HTML);
  });

  bot.command('help', async (ctx) => {
    const user = await getUserByChat(String(ctx.chat.id));
    await ctx.reply(helpText(user ? getEffectivePlan(user) === 'PRO' : false), HTML);
  });

  // ---------- /link & /unlink ----------
  bot.command('link', async (ctx) => {
    const code = (ctx.match ?? '').toString().trim();
    const chatId = String(ctx.chat.id);
    const rl = await rateLimit('tg-link', chatId, 5, 10 * 60); // cegah tebak-tebak kode 6 digit
    if (!rl.success) { await ctx.reply('⏳ Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'); return; }
    if (!code) { await ctx.reply('Format: <code>/link KODE</code> (kode 6 digit dari Pengaturan di FinancePro).', HTML); return; }

    const res = await consumeLinkCode(code, chatId);
    if (res.ok) {
      await ctx.reply(`✅ Terhubung sebagai <b>${h(res.username)}</b>.\n\nKetik /help untuk melihat perintah.`, HTML);
    } else if (res.reason === 'chat_taken') {
      await ctx.reply('⚠️ Chat ini sudah tertaut ke akun lain. Kirim /unlink dulu, lalu hubungkan lagi dengan kode baru.');
    } else {
      await ctx.reply('❌ Kode tidak valid atau sudah kedaluwarsa. Buat kode baru di Pengaturan.');
    }
  });

  bot.command('unlink', async (ctx) => {
    const ok = await unlinkByChat(String(ctx.chat.id));
    await ctx.reply(ok ? '🔓 Chat ini sudah diputuskan dari akun FinancePro.' : 'Chat ini belum tertaut ke akun.');
  });

  // ---------- Template ----------
  bot.command('templatetransaksi', async (ctx) => {
    await ctx.reply(
      `📝 <b>Format Transaksi:</b>\n\n` +
      `<code>DD/MM/YYYY | Kategori | Deskripsi | Rekening | Jenis | Nominal | Catatan</code>\n\n` +
      `<b>Contoh:</b>\n` +
      `<code>02/02/2026 | Makan &amp; Minum | Nasi goreng | Tunai | Pengeluaran | 20000 | Makan siang</code>\n\n` +
      `Jenis: <i>Pemasukan</i> atau <i>Pengeluaran</i>. Nominal Rupiah bulat (tanpa desimal). Catatan: opsional.`,
      HTML,
    );
  });

  bot.command('templateinvestasi', async (ctx) => {
    await ctx.reply(
      `📝 <b>Format Nabung/Investasi:</b>\n\n` +
      `<code>DD/MM/YYYY | JenisAset | NamaInstrumen | Tipe | Nominal | HargaPerUnit | Rekening | Catatan</code>\n\n` +
      `<b>Contoh:</b>\n` +
      `<code>02/02/2026 | Investasi | Makmur RDPT | Buy | 1000000 | 1500 | BCA | Beli reksadana</code>\n\n` +
      `Tipe: Buy, Sell, Withdraw, Goals`,
      HTML,
    );
  });

  // ---------- Transaksi (FREE & PRO) ----------
  bot.command('add', async (ctx) => {
    const text = ctx.match.toString().trim();
    if (!text) {
      await setPending(ctx.fp!.id, 'add');
      await ctx.reply(`📝 Kirim data transaksi:\n\n<code>DD/MM/YYYY | Kategori | Deskripsi | Rekening | Jenis | Nominal | Catatan</code>\n\nAtau ketik /templatetransaksi`, HTML);
      return;
    }
    await handleAddTransaction(ctx, text);
  });

  bot.command(['transaksi', 'transactions'], handleShowTransactions);

  bot.command('dashboard', async (ctx) => {
    await ctx.reply(`📈 <b>Dashboard FinancePro</b>\n\n${baseUrl()}/dashboard`, HTML);
  });

  // ---------- PRO ----------
  const savingsHandler = async (ctx: BotCtx) => {
    const text = (ctx.match ?? '').toString().trim();
    if (!text) {
      await setPending(ctx.fp!.id, 'nabung');
      await ctx.reply(`💰 Kirim data:\n<code>DD/MM/YYYY | JenisAset | Instrumen | Tipe | Nominal | HargaPerUnit | Rekening | Catatan</code>`, HTML);
      return;
    }
    await handleAddSavings(ctx, text);
  };
  bot.command('nabung', savingsHandler);
  bot.command('investasi', savingsHandler);

  bot.command('bayar', async (ctx) => {
    const text = ctx.match.toString().trim();
    if (!text) {
      await setPending(ctx.fp!.id, 'add');
      await ctx.reply(`💳 Format bayar utang:\n<code>DD/MM/YYYY | Cicilan | NamaUtang | Rekening | Pengeluaran | Nominal</code>`, HTML);
      return;
    }
    await handleAddTransaction(ctx, text);
  });

  bot.command('hutang', async (ctx) => safe(ctx, 'data utang', async () => {
    const debts = await getDebtSummaries(ctx.fp!.id);
    if (debts.length === 0) { await ctx.reply('✅ Tidak ada data utang.'); return; }
    let msg = `💸 <b>Ringkasan Utang</b>\n\n`;
    let total = 0;
    debts.forEach((d, i) => {
      total += d.remainingDebt;
      const icon = d.status === 'Lunas' ? '✅' : d.status === 'Over Limit' ? '🔴' : '🟡';
      msg += `${i + 1}. <b>${h(d.debtName)}</b> (${h(d.debtType)})\n   Limit/Pokok: ${formatCurrency(d.limitOrPrincipal)}\n   Sisa: ${formatCurrency(d.remainingDebt)}\n   ${icon} ${h(d.status)}\n\n`;
    });
    msg += `\n💰 <b>Total Sisa Utang: ${formatCurrency(total)}</b>`;
    await ctx.reply(msg, HTML);
  }));

  bot.command('aset', async (ctx) => safe(ctx, 'data aset', async () => {
    const assets = await getAssetSummaries(ctx.fp!.id);
    if (assets.length === 0) { await ctx.reply('📭 Belum ada data aset.'); return; }
    let msg = `💰 <b>Ringkasan Aset</b>\n\n`;
    let totalVal = 0, totalCap = 0;
    assets.forEach((a, i) => {
      totalVal += a.currentValue; totalCap += a.totalCapital;
      msg += `${i + 1}. <b>${h(a.instrumentName)}</b> (${h(a.assetType)})\n   Modal: ${formatCurrency(a.totalCapital)}\n   Nilai: ${formatCurrency(a.currentValue)}\n   ${a.profitLoss >= 0 ? '📈' : '📉'} P/L: ${formatCurrency(a.profitLoss)} (${a.returnPercentage.toFixed(1)}%)\n\n`;
    });
    msg += `📊 <b>Total Modal: ${formatCurrency(totalCap)}</b>\n<b>Total Nilai: ${formatCurrency(totalVal)}</b>\n<b>Total P/L: ${formatCurrency(totalVal - totalCap)}</b>`;
    await ctx.reply(msg, HTML);
  }));

  bot.command('budget', async (ctx) => safe(ctx, 'data budget', async () => {
    const budgets = await getBudgetSummaries(ctx.fp!.id);
    if (budgets.length === 0) { await ctx.reply('📭 Belum ada data budget.'); return; }
    let msg = `📊 <b>Budget vs Aktual</b>\n\n`;
    budgets.forEach(b => {
      const icon = b.status === 'Aman' ? '✅' : b.status === 'Hampir Over' ? '⚠️' : '🔴';
      msg += `${icon} <b>${h(b.category)}</b> (${h(b.month)})\n   Budget: ${formatCurrency(b.budgetAmount)}\n   Realisasi: ${formatCurrency(b.realisation)} (${b.percentage.toFixed(0)}%)\n   Selisih: ${formatCurrency(b.difference)}\n\n`;
    });
    await ctx.reply(msg, HTML);
  }));

  bot.command('goals', async (ctx) => safe(ctx, 'data goals', async () => {
    const goals = await getGoalSummaries(ctx.fp!.id);
    if (goals.length === 0) { await ctx.reply('📭 Belum ada goals.'); return; }
    let msg = `🎯 <b>Progress Goals</b>\n\n`;
    goals.forEach(g => {
      const icon = g.status === 'Tercapai' ? '✅' : g.status === 'Gagal' ? '❌' : '🔄';
      msg += `${icon} <b>${h(g.goalName)}</b>\n   Target: ${formatCurrency(g.targetAmount)}\n   Terkumpul: ${formatCurrency(g.accumulatedAmount)}\n   ${progressBar(g.progress)} ${g.progress.toFixed(0)}%\n   Deadline: ${h(g.targetDate)}\n\n`;
    });
    await ctx.reply(msg, HTML);
  }));

  bot.command('harian', async (ctx) => {
    const text = ctx.match.toString().trim();
    if (!text) { await setPending(ctx.fp!.id, 'harian'); await ctx.reply('📅 Masukkan tanggal (DD/MM/YYYY):'); return; }
    await handleDailyReport(ctx, text);
  });

  bot.command('mingguan', async (ctx) => {
    const text = ctx.match.toString().trim();
    if (!text) { await setPending(ctx.fp!.id, 'mingguan'); await ctx.reply('📆 Format: <code>Minggu X YYYY | Minggu Y YYYY</code>', HTML); return; }
    await handleWeekly(ctx, text);
  });

  bot.command('bulanan', async (ctx) => {
    const text = ctx.match.toString().trim();
    if (!text) { await setPending(ctx.fp!.id, 'bulanan'); await ctx.reply('🗓️ Masukkan bulan (contoh: <code>Feb 2026</code>):', HTML); return; }
    await handleMonthly(ctx, text);
  });

  // ---------- Masukan lanjutan untuk perintah multi-langkah ----------
  bot.on('message:text', async (ctx) => {
    const user = ctx.fp;
    const text = ctx.message.text.trim();
    if (!user || text.startsWith('/')) return;
    const pending = activePending(user);
    if (!pending || pending.startsWith('ai:')) {
      // Tanpa perintah menunggu: anggap kalimat bebas ("makan siang 25rb pakai BCA"); draf lama yang belum dikonfirmasi diganti.
      await handleFreeText(ctx, text);
      return;
    }
    await clearPending(user.id);

    switch (pending) {
      case 'add': await handleAddTransaction(ctx, text); break;
      case 'nabung': await handleAddSavings(ctx, text); break;
      case 'harian': await handleDailyReport(ctx, text); break;
      case 'mingguan': await handleWeekly(ctx, text); break;
      case 'bulanan': await handleMonthly(ctx, text); break;
    }
  });

  // ---------- Foto nota ----------
  bot.on('message:photo', async (ctx) => {
    const user = ctx.fp;
    if (!user) return;
    if (getEffectivePlan(user) !== 'PRO') { await ctx.reply(UPGRADE(), HTML); return; }
    if (getReceiptProvider() === 'ondevice') {
      await ctx.reply('📷 Membaca foto nota di bot butuh pembaca AI yang belum aktif. Gunakan menu <b>Scan Nota</b> di web: ' + baseUrl() + '/dashboard/scan', HTML);
      return;
    }
    const rl = await rateLimit('tg-ai', user.id, 30, 3600);
    if (!rl.success) { await ctx.reply('⏳ Terlalu banyak permintaan. Coba lagi nanti.'); return; }

    try {
      const photos = ctx.message.photo;
      const pick = [...photos].reverse().find((p) => (p.file_size ?? 0) <= MAX_IMAGE_BYTES) ?? photos[0];
      if ((pick.file_size ?? 0) > MAX_IMAGE_BYTES) { await ctx.reply('❌ Foto terlalu besar (maksimal 4 MB).'); return; }
      const file = await ctx.api.getFile(pick.file_id);
      if (!file.file_path) throw new Error('file_path kosong');
      const res = await fetch(`${apiRoot}/file/bot${token}/${file.file_path}`, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`unduh foto HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length > MAX_IMAGE_BYTES) { await ctx.reply('❌ Foto terlalu besar (maksimal 4 MB).'); return; }
      const mime = sniffImageMime(bytes);
      if (!mime) { await ctx.reply('❌ Format foto harus JPEG, PNG, atau WebP.'); return; }

      await ctx.reply('🔎 Membaca nota...');
      const lists = await entryLists(user.id);
      const raw = await readReceiptWithActiveProvider(bytes, mime, lists.categories);
      const { draft } = normalizeReceipt(raw, { categories: lists.categories });
      const { entry } = normalizeChatEntry(
        { type: 'Pengeluaran', amount: draft.amount, description: draft.merchant || 'Belanja', category: draft.category, account: '', date: draft.date },
        lists,
      );
      await proposeEntry(ctx, entry);
    } catch (err) {
      console.error('[telegram] foto nota:', err instanceof Error ? err.message : err);
      await ctx.reply('❌ Nota tidak terbaca. Coba foto lebih jelas dan lurus, atau ketik manual: <code>makan siang 25rb</code>', HTML);
    }
  });

  // ---------- Tombol konfirmasi ----------
  bot.callbackQuery('ai:cancel', async (ctx) => {
    const user = ctx.fp;
    if (!user) return;
    const pending = activePending(user);
    if (pending?.startsWith('ai:')) await claimPending(user.id, user.telegramPending!);
    await ctx.answerCallbackQuery({ text: 'Dibatalkan' });
    await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});
    await ctx.reply('❌ Dibatalkan.');
  });

  bot.callbackQuery('ai:save', async (ctx) => {
    const user = ctx.fp;
    if (!user) return;
    if (getEffectivePlan(user) !== 'PRO') { await ctx.answerCallbackQuery(); await ctx.reply(UPGRADE(), HTML); return; }
    const pending = activePending(user);
    // Klaim atomik: klik ganda / tombol lama tidak bisa menyimpan dua kali.
    if (!pending?.startsWith('ai:') || !(await claimPending(user.id, user.telegramPending!))) {
      await ctx.answerCallbackQuery({ text: 'Draf sudah tidak berlaku' });
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});
      return;
    }
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});
    await safe(ctx, 'transaksi', async () => {
      // Validasi ulang terhadap daftar kategori/rekening TERKINI (draf bisa kedaluwarsa atau diubah di web).
      const lists = await entryLists(user.id);
      let entry: ChatEntry;
      try { entry = normalizeChatEntry(JSON.parse(pending.slice(3)), lists).entry; } catch { await ctx.reply('❌ Draf tidak valid. Kirim ulang pesannya.'); return; }
      const tx = await createTransaction(user.id, {
        date: entry.date, category: entry.category, description: entry.description, account: entry.account, type: entry.type, amount: entry.amount,
      });
      await ctx.reply(`✅ <b>Tersimpan!</b>\n🆔 ${h(tx.txId)}\n${entry.type === 'Pemasukan' ? '💰' : '💸'} ${formatCurrency(entry.amount)} — ${h(entry.description)}`, HTML);
    });
  });

  return bot;
}

// ---------- Pembantu ----------

// Daftar kategori & rekening milik user: satu-satunya nilai yang boleh dipakai oleh usulan otomatis.
async function entryLists(userId: string): Promise<EntryContext> {
  const [cats, accs] = await Promise.all([
    prisma.category.findMany({ where: { userId }, select: { name: true }, orderBy: { name: 'asc' } }),
    prisma.account.findMany({ where: { userId }, select: { name: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  const categories = cats.map((c) => c.name);
  if (!categories.includes('Lainnya')) categories.push('Lainnya');
  const accounts = accs.map((a) => a.name);
  return { categories, accounts, defaultAccount: accounts[0] ?? 'Tunai', today: todayWib() };
}

// Menyimpan draf di pending (10 menit) dan meminta konfirmasi dengan tombol. Tidak ada yang disimpan sebelum user menekan "Simpan".
async function proposeEntry(ctx: BotCtx, entry: ChatEntry) {
  await setPending(ctx.fp!.id, 'ai:' + JSON.stringify(entry));
  const [y, m, d] = entry.date.split('-');
  await ctx.reply(
    `📝 <b>Simpan transaksi ini?</b>\n\n${entry.type === 'Pemasukan' ? '💰 Pemasukan' : '💸 Pengeluaran'}: <b>${formatCurrency(entry.amount)}</b>\n` +
    `📂 ${h(entry.category)}\n📄 ${h(entry.description)}\n🏦 ${h(entry.account)}\n📅 ${d}/${m}/${y}\n\n<i>Berlaku 10 menit.</i>`,
    { ...HTML, reply_markup: { inline_keyboard: [[{ text: '✅ Simpan', callback_data: 'ai:save' }, { text: '❌ Batal', callback_data: 'ai:cancel' }]] } },
  );
}

async function handleFreeText(ctx: BotCtx, text: string) {
  const user = ctx.fp!;
  if (getEffectivePlan(user) !== 'PRO') {
    await ctx.reply('💡 Mencatat dari kalimat bebas khusus <b>PRO</b>. Gunakan /add atau upgrade: ' + baseUrl() + '/dashboard/upgrade', HTML);
    return;
  }
  const rl = await rateLimit('tg-ai', user.id, 30, 3600);
  if (!rl.success) { await ctx.reply('⏳ Terlalu banyak permintaan. Coba lagi nanti.'); return; }
  if (text.length > 500) { await ctx.reply('❌ Pesan terlalu panjang (maksimal 500 karakter).'); return; }

  try {
    const lists = await entryLists(user.id);
    let entry: ChatEntry | null = null;
    // 1) AI (bila aktif); 2) parser aturan sebagai cadangan gratis.
    if (getReceiptProvider() !== 'ondevice') {
      try { entry = normalizeChatEntry(await readEntryWithLLM(text, { ...lists, today: lists.today! }), lists).entry; }
      catch (e) { if (!(e instanceof EntryParseError)) console.error('[telegram] AI kalimat:', e instanceof Error ? e.message : e); }
    }
    if (!entry) {
      const raw = parseChatHeuristic(text, lists);
      if (raw) { try { entry = normalizeChatEntry(raw, lists).entry; } catch { /* jatuh ke bantuan di bawah */ } }
    }
    if (!entry) {
      await ctx.reply('🤔 Aku belum menemukan nominalnya. Contoh: <code>makan siang 25rb pakai BCA</code> atau <code>gaji masuk 5jt</code>. Atau kirim foto nota.', HTML);
      return;
    }
    await proposeEntry(ctx, entry);
  } catch (err) {
    console.error('[telegram] kalimat bebas:', err instanceof Error ? err.message : err);
    await ctx.reply('❌ Gagal memproses pesan. Coba lagi.');
  }
}

function helpText(isPro: boolean): string {
  const lock = isPro ? '' : ' 🔒';
  return (
    `📖 <b>Daftar Perintah FinancePro</b>\n\n` +
    `<b>💰 Transaksi:</b>\n/add - Tambah transaksi baru\n/transaksi - 10 transaksi terakhir\n/templatetransaksi - Format input\n\n` +
    `<b>📈 Khusus PRO${isPro ? '' : ' (upgrade untuk membuka)'}:</b>\n` +
    `/nabung /investasi${lock} - Catat tabungan/investasi\n/hutang /bayar${lock} - Utang\n/aset /budget /goals${lock}\n` +
    `/harian /mingguan /bulanan${lock} - Laporan\n\n` +
    `<b>🤖 Catat otomatis${isPro ? '' : ' (PRO)'}:</b>\nKetik saja: <code>makan siang 25rb pakai BCA</code>, atau kirim foto nota. Aku tampilkan dulu, lalu kamu konfirmasi.\n\n` +
    `<b>⚙️ Akun:</b>\n/link KODE - Hubungkan akun\n/unlink - Putuskan akun\n/dashboard - Buka web dashboard`
  );
}

// Menjalankan blok dan membalas pesan umum bila gagal. Detail kesalahan hanya dicatat di server, tidak ke pengguna.
async function safe(ctx: BotCtx, what: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    if (err instanceof PlanLimitError) { await ctx.reply(`🔒 ${h(err.message)}`, HTML); return; }
    console.error(`[telegram] ${what}:`, err instanceof Error ? err.message : err);
    await ctx.reply(`❌ Gagal memproses ${what}. Coba lagi.`);
  }
}

async function handleAddTransaction(ctx: BotCtx, text: string) {
  const parts = text.split('|').map(p => p.trim());
  if (parts.length < 6) { await ctx.reply('❌ Format salah. Ketik /templatetransaksi untuk contoh.'); return; }

  const raw: RawRow = { ref: 1, date: parts[0], category: parts[1], description: parts[2], account: parts[3], type: parts[4], amount: parts[5], note: parts[6] };
  const v = validateRow(raw, { typeMode: 'column', todayYmd: todayWib() });
  if (!v.ok) { await ctx.reply(`❌ ${h(v.error)}\nKetik /templatetransaksi untuk contoh.`, HTML); return; }
  const r = v.value;

  await safe(ctx, 'transaksi', async () => {
    const tx = await createTransaction(ctx.fp!.id, {
      date: r.date, category: r.category, description: r.description, account: r.account, type: r.type, amount: r.amount, note: r.note ?? undefined,
    });
    await ctx.reply(
      `✅ <b>Transaksi disimpan!</b>\n\n🆔 ${h(tx.txId)}\n📅 ${h(r.date)}\n📂 ${h(r.category)}\n📝 ${h(r.description)}\n🏦 ${h(r.account)}\n` +
      `${r.type === 'Pemasukan' ? '💰' : '💸'} ${r.type}: ${formatCurrency(r.amount)}`,
      HTML,
    );
  });
}

async function handleAddSavings(ctx: BotCtx, text: string) {
  const parts = text.split('|').map(p => p.trim());
  if (parts.length < 7) { await ctx.reply('❌ Format salah. Ketik /templateinvestasi untuk contoh.'); return; }
  const [dateRaw, assetType, instrumentName, txType, nominalRaw, priceRaw, account, notes] = parts;

  const date = parseImportDate(dateRaw, todayWib());
  if (!date.ok) { await ctx.reply(`❌ ${h(date.error)}`, HTML); return; }
  if (!['Buy', 'Sell', 'Withdraw', 'Goals'].includes(txType)) { await ctx.reply('❌ Tipe harus Buy, Sell, Withdraw, atau Goals.'); return; }
  if (!assetType || !instrumentName || !account || assetType.length > 100 || instrumentName.length > 100 || account.length > 50) {
    await ctx.reply('❌ Jenis aset, instrumen, dan rekening wajib diisi (panjang wajar).'); return;
  }
  const nominal = parseRupiah(nominalRaw);
  if (!nominal.ok || nominal.value <= 0) { await ctx.reply(`❌ Nominal: ${h(nominal.ok ? 'harus lebih dari 0' : nominal.error)}`, HTML); return; }
  let price: number | undefined;
  if (priceRaw) {
    const p = parseRupiah(priceRaw);
    if (!p.ok || p.value <= 0) { await ctx.reply(`❌ Harga per unit: ${h(p.ok ? 'harus lebih dari 0' : p.error)}`, HTML); return; }
    price = p.value;
  }

  await safe(ctx, 'nabung/investasi', async () => {
    const item = await createSavingsInvestment(ctx.fp!.id, {
      date: date.value, assetType, instrumentName, transactionType: txType as 'Buy' | 'Sell' | 'Withdraw' | 'Goals',
      nominal: nominal.value, pricePerUnit: price, account, notes: notes || undefined,
    });
    await ctx.reply(
      `✅ <b>Nabung/Investasi dicatat!</b>\n\n🆔 ${h(item.invId)}\n📂 ${h(assetType)} — ${h(instrumentName)}\n📋 ${h(txType)}\n💰 ${formatCurrency(nominal.value)}`,
      HTML,
    );
  });
}

async function handleShowTransactions(ctx: BotCtx) {
  await safe(ctx, 'transaksi', async () => {
    const { transactions } = await getTransactions(ctx.fp!.id, { limit: 10 });
    if (transactions.length === 0) { await ctx.reply('📭 Belum ada transaksi.'); return; }
    let msg = `📥 <b>10 Transaksi Terakhir</b>\n\n`;
    transactions.forEach((t, i) => {
      msg += `${i + 1}. ${t.type === 'Pemasukan' ? '💰' : '💸'} ${t.date.toLocaleDateString('id-ID')} — ${h(t.category.name)}\n   ${h(t.description)}: ${formatCurrency(t.amount)}\n   [${h(t.account.name)}] <code>${h(t.txId)}</code>\n\n`;
    });
    await ctx.reply(msg, HTML);
  });
}

async function handleDailyReport(ctx: BotCtx, dateStr: string) {
  const d = parseImportDate(dateStr, todayWib());
  if (!d.ok) { await ctx.reply(`❌ ${h(d.error)}`, HTML); return; }
  await safe(ctx, 'laporan', async () => {
    const r = await getDailyReport(ctx.fp!.id, d.value);
    let msg = `📅 <b>Laporan Harian — ${h(r.date)}</b>\n\n💰 Pemasukan: ${formatCurrency(r.totalIncome)}\n💸 Pengeluaran: ${formatCurrency(r.totalExpense)}\n📊 Saldo: ${formatCurrency(r.balance)}\n🔢 Transaksi: ${r.transactionCount}\n📈 Rata-rata: ${formatCurrency(r.averagePerTransaction)}\n🏆 Terbesar: ${h(r.largestCategory)}\n📉 Terkecil: ${h(r.smallestCategory)}\n\n`;
    if (r.transactions.length > 0) {
      msg += `<b>Daftar:</b>\n`;
      r.transactions.forEach((t, i) => { msg += `${i + 1}. ${t.type === 'Pemasukan' ? '💰' : '💸'} ${h(t.category)} — ${h(t.description)}: ${formatCurrency(t.amount)}\n`; });
    }
    await ctx.reply(msg, HTML);
  });
}

async function handleWeekly(ctx: BotCtx, text: string) {
  const parts = text.split('|').map(p => p.trim());
  if (parts.length < 2 || !parts[0] || !parts[1] || parts[0].length > 30 || parts[1].length > 30) { await ctx.reply('❌ Format salah. Contoh: Minggu 45 2026 | Minggu 44 2026'); return; }
  const [w1, w2] = parts;
  await safe(ctx, 'laporan', async () => {
    const r = await getWeeklyReport(ctx.fp!.id, w1, w2);
    const icon = r.difference > 0 ? '🔴' : r.difference < 0 ? '🟢' : '⚪';
    let msg = `📆 <b>Laporan Mingguan</b>\n${h(w1)} vs ${h(w2)}\n\n💸 ${h(w1)}: ${formatCurrency(r.totalThis)}\n💸 ${h(w2)}: ${formatCurrency(r.totalLast)}\n📊 Selisih: ${formatCurrency(r.difference)}\n${icon} ${h(r.trend)}\n\n`;
    if (r.categories.length > 0) {
      msg += `<b>Per Kategori:</b>\n`;
      r.categories.forEach(c => { msg += `• ${h(c.category)}: ${formatCurrency(c.thisWeek)} vs ${formatCurrency(c.lastWeek)} — ${h(c.changeLabel)}\n`; });
    }
    await ctx.reply(msg, HTML);
  });
}

async function handleMonthly(ctx: BotCtx, month: string) {
  if (!month || month.length > 30) { await ctx.reply('❌ Format salah. Contoh: Nov 2026'); return; }
  await safe(ctx, 'laporan', async () => {
    const r = await getMonthlyReport(ctx.fp!.id, month);
    let msg = `🗓️ <b>Laporan Bulanan — ${h(month)}</b>\n\n💰 Pemasukan: ${formatCurrency(r.income)}\n💸 Pengeluaran: ${formatCurrency(r.expense)}\n🏦 Tabungan: ${formatCurrency(r.savings)} (${r.savingsPercentage.toFixed(1)}%)\n📈 Investasi: ${formatCurrency(r.investment)}\n🎯 Goal: ${formatCurrency(r.goalSavings)}\n💳 Bayar Utang: ${formatCurrency(r.debtPayment)}\n\n`;
    if (r.categoryBreakdown.length > 0) {
      msg += `<b>Breakdown:</b>\n`;
      r.categoryBreakdown.forEach(c => {
        const pct = c.percentage > 0 ? ` (${c.percentage.toFixed(0)}%)` : '';
        msg += `• ${h(c.category)}: ${formatCurrency(c.actual)}`;
        if (c.budget > 0) msg += ` / ${formatCurrency(c.budget)}${pct}`;
        msg += `\n`;
      });
    }
    await ctx.reply(msg, HTML);
  });
}

function progressBar(pct: number): string {
  const filled = Math.round(Math.min(pct, 100) / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}
