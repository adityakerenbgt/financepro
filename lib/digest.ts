import { endOfISOWeek, format, startOfISOWeek } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import prisma from './db';
import { appBaseUrl, sendEmail } from './email';
import { getBudgetSummaries, getWeeklyReport } from './services';
import { getMonthString, getWeekString } from './utils';
import { signUnsubscribeToken } from './digestToken';
import { weeklyDigestEmail, type DigestData } from './email/templates/weeklyDigest';

const DAY = 24 * 60 * 60 * 1000;

export interface DigestWeeks {
  lastLabel: string; // label pekan yang dilaporkan, format sama dengan Transaction.week
  prevLabel: string; // pekan sebelumnya
  periodLabel: string;
  weekKey: Date; // tanggal Senin pekan yang dilaporkan (UTC 00:00), dipakai sebagai penanda "sudah diproses"
}

// Pekan yang dilaporkan = pekan ISO penuh sebelum `now` (Senin-Minggu). Label memakai getWeekString, fungsi yang sama
// dengan yang menyimpan Transaction.week, supaya angka digest identik dengan halaman Laporan.
export function digestWeeks(now: Date = new Date()): DigestWeeks {
  const lastRef = new Date(now.getTime() - 7 * DAY);
  const prevRef = new Date(now.getTime() - 14 * DAY);
  const start = startOfISOWeek(lastRef);
  const end = endOfISOWeek(lastRef);
  return {
    lastLabel: getWeekString(lastRef),
    prevLabel: getWeekString(prevRef),
    periodLabel: `${format(start, 'd MMM', { locale: localeID })} – ${format(end, 'd MMM yyyy', { locale: localeID })}`,
    weekKey: new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())),
  };
}

// Menyusun data digest satu user. null bila tidak ada transaksi di pekan yang dilaporkan (tidak perlu dikirim).
export async function buildDigest(userId: string, weeks: DigestWeeks, now: Date = new Date()): Promise<DigestData | null> {
  const activity = await prisma.transaction.count({ where: { userId, week: weeks.lastLabel } });
  if (activity === 0) return null;

  const [report, income, budgets] = await Promise.all([
    getWeeklyReport(userId, weeks.lastLabel, weeks.prevLabel),
    prisma.transaction.aggregate({ where: { userId, week: weeks.lastLabel, type: 'Pemasukan' }, _sum: { amount: true } }),
    getBudgetSummaries(userId, getMonthString(now)),
  ]);

  return {
    periodLabel: weeks.periodLabel,
    totalExpense: report.totalThis,
    prevExpense: report.totalLast,
    totalIncome: income._sum.amount ?? 0,
    topCategories: report.categories
      .filter(c => c.thisWeek > 0)
      .sort((a, b) => b.thisWeek - a.thisWeek)
      .slice(0, 3)
      .map(c => ({ category: c.category, amount: c.thisWeek, changeLabel: c.changeLabel })),
    budgetAlerts: budgets
      .filter(b => b.percentage >= 80)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5)
      .map(b => ({ category: b.category, percentage: b.percentage, status: b.status })),
  };
}

export function unsubscribeUrl(userId: string): string {
  return `${appBaseUrl()}/unsubscribe?u=${encodeURIComponent(userId)}&t=${signUnsubscribeToken(userId)}`;
}

export interface DigestSummary {
  eligible: number;
  sent: number;
  noActivity: number; // diproses tetapi tidak dikirim karena tidak ada transaksi
  skipped: number; // layanan email belum dikonfigurasi
  failed: number;
}

// Mengirim digest mingguan. Aturan:
// - hanya user yang punya email dan tidak opt-out (profil belum ada = default aktif)
// - satu digest per pekan per user: User.lastDigestWeek diklaim atomik sebelum diproses (run serentak aman)
// - tanpa transaksi di pekan itu: ditandai selesai, tidak ada email
// - gagal kirim / layanan email belum aktif: klaim dibatalkan agar run berikutnya (cron berjalan Sen-Rab) mencoba lagi
// - throughput: beberapa user disusun paralel (concurrency), tetapi PENGIRIMAN dilewatkan satu pengatur laju bersama
//   (minimal `delayMs` antar email) agar patuh batas laju penyedia email
// - batas waktu per run (`budgetMs`): setelah terlewati tidak memulai user baru; sisanya dikerjakan run berikutnya
export async function runWeeklyDigest(
  now: Date = new Date(),
  opts: { batchLimit?: number; delayMs?: number; concurrency?: number; budgetMs?: number } = {},
): Promise<DigestSummary & { timeBudgetHit: boolean }> {
  const batchLimit = opts.batchLimit ?? 80; // praktisnya dibatasi budgetMs (~75 email per run pada jeda 600 ms)
  const delayMs = opts.delayMs ?? 600; // ~1,7 email/dtk: margin dari batas ~2/dtk penyedia email (timer punya jitter)
  const concurrency = Math.max(1, opts.concurrency ?? 3);
  const budgetMs = opts.budgetMs ?? 45_000; // fungsi cron dibatasi 60 dtk
  const weeks = digestWeeks(now);
  const startedAt = Date.now();

  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      AND: [
        { OR: [{ profile: null }, { profile: { emailDigest: true } }] },
        { OR: [{ lastDigestWeek: null }, { lastDigestWeek: { not: weeks.weekKey } }] },
      ],
    },
    select: { id: true, email: true, username: true, displayName: true, lastDigestWeek: true },
    orderBy: { createdAt: 'asc' },
    take: batchLimit,
  });

  const summary: DigestSummary & { timeBudgetHit: boolean } = { eligible: users.length, sent: 0, noActivity: 0, skipped: 0, failed: 0, timeBudgetHit: false };

  // Pengatur laju: setiap pengiriman mendapat slot waktu sendiri, berjarak minimal delayMs dari slot sebelumnya.
  let nextSendAt = 0;
  const reserveSendSlot = async () => {
    const slot = Math.max(Date.now(), nextSendAt);
    nextSendAt = slot + delayMs;
    const wait = slot - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
  };

  const processUser = async (u: (typeof users)[number]) => {
    const claimed = await prisma.user.updateMany({
      where: { id: u.id, OR: [{ lastDigestWeek: null }, { lastDigestWeek: { not: weeks.weekKey } }] },
      data: { lastDigestWeek: weeks.weekKey },
    });
    if (claimed.count !== 1) return; // sudah diklaim run lain

    const release = () => prisma.user.updateMany({ where: { id: u.id, lastDigestWeek: weeks.weekKey }, data: { lastDigestWeek: u.lastDigestWeek } });

    let data: DigestData | null;
    try {
      data = await buildDigest(u.id, weeks, now);
    } catch (err) {
      console.error('[digest] gagal menyusun digest:', err instanceof Error ? err.message : err);
      await release();
      summary.failed++;
      return;
    }
    if (!data) { summary.noActivity++; return; }

    await reserveSendSlot();
    const res = await sendEmail(weeklyDigestEmail({
      to: u.email!, name: u.displayName || u.username, data, unsubscribeUrl: unsubscribeUrl(u.id),
    }));
    if (res.ok) {
      summary.sent++;
    } else {
      await release();
      if (res.skipped) summary.skipped++;
      else summary.failed++;
    }
  };

  let next = 0;
  const worker = async () => {
    while (true) {
      if (Date.now() - startedAt > budgetMs) { summary.timeBudgetHit = true; return; }
      const u = users[next++];
      if (!u) return;
      await processUser(u);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, users.length) }, worker));
  return summary;
}
