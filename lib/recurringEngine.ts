import prisma from './db';
import { createTransaction } from './services';
import { getEffectivePlan } from './plan';
import { dateToYmd, dueOccurrences, nextAfter, todayWib, ymdToDate, type Frequency } from './recurring';

export interface RecurringSummary {
  schedules: number; // jadwal jatuh tempo yang diproses
  created: number; // transaksi baru dibuat
  alreadyDone: number; // kemunculan yang ternyata sudah ada (run sebelumnya/serentak), tidak dibuat ulang
  failed: number;
  skippedNotPro: number; // jadwal milik user yang bukan PRO (tidak diproses)
  completed: number; // jadwal yang melewati tanggal akhir lalu dinonaktifkan
  timeBudgetHit: boolean;
}

type Item = Awaited<ReturnType<typeof loadDue>>[number];

function loadDue(todayDate: Date, take: number) {
  return prisma.recurringTransaction.findMany({
    where: { active: true, nextRunAt: { lte: todayDate } },
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
      user: { select: { role: true, plan: true, planExpiresAt: true } },
    },
    orderBy: { nextRunAt: 'asc' }, // yang paling tertinggal lebih dulu
    take,
  });
}

function isUniqueViolation(e: any): boolean {
  return e?.code === 'P2002';
}

// Membuat transaksi dari jadwal berulang yang sudah jatuh tempo. Aturan:
// - "hari ini" menurut WIB (cron berjalan 00:05 WIB = 17:05 UTC)
// - setiap kemunculan dibuat lewat createTransaction (saldo rekening ikut benar) dengan pasangan unik
//   (recurringId, recurringDate): satu jadwal tidak mungkin membuat dua transaksi untuk tanggal yang sama, bahkan bila
//   cron berjalan dua kali/serentak atau proses terhenti sebelum nextRunAt dimajukan (run berikutnya mendeteksi yang
//   sudah ada dan hanya memajukan jadwal, tanpa menyentuh saldo)
// - jadwal yang tertinggal dikejar maksimum 31 kemunculan per jadwal per run (sisanya run berikutnya)
// - hanya untuk user PRO (plan efektif); jadwal user FREE dibiarkan apa adanya
// - jadwal satu user diproses berurutan (nomor transaksi dihitung per user), antar user paralel
// - anggaran waktu: setelah `budgetMs` tidak memulai user baru; sisanya dikerjakan run berikutnya
export async function runRecurring(
  now: Date = new Date(),
  opts: { budgetMs?: number; concurrency?: number; batchLimit?: number } = {},
): Promise<RecurringSummary> {
  const budgetMs = opts.budgetMs ?? 45_000;
  const concurrency = Math.max(1, opts.concurrency ?? 3);
  const batchLimit = opts.batchLimit ?? 500;
  const startedAt = Date.now();
  const today = todayWib(now);

  const items = await loadDue(ymdToDate(today), batchLimit);
  const summary: RecurringSummary = { schedules: 0, created: 0, alreadyDone: 0, failed: 0, skippedNotPro: 0, completed: 0, timeBudgetHit: false };

  const byUser = new Map<string, Item[]>();
  for (const it of items) {
    if (getEffectivePlan(it.user, now) !== 'PRO') { summary.skippedNotPro++; continue; }
    (byUser.get(it.userId) ?? byUser.set(it.userId, []).get(it.userId)!).push(it);
  }

  const processItem = async (it: Item) => {
    const start = dateToYmd(it.startDate);
    const end = it.endDate ? dateToYmd(it.endDate) : null;
    const freq = it.frequency as Frequency;
    const dues = dueOccurrences(start, freq, dateToYmd(it.nextRunAt), today, end);
    summary.schedules++;

    for (const date of dues) {
      const input = {
        date, category: it.category.name, description: it.description, account: it.account.name,
        type: it.type, amount: it.amount, note: it.note ?? undefined, recurringId: it.id, recurringDate: date,
      } as const;

      let done = false;
      for (let attempt = 0; attempt < 2 && !done; attempt++) {
        try {
          await createTransaction(it.userId, input);
          summary.created++;
          done = true;
        } catch (e) {
          if (!isUniqueViolation(e)) { console.error('[recurring] gagal membuat transaksi:', e instanceof Error ? e.message : e); break; }
          const exists = await prisma.transaction.findFirst({ where: { recurringId: it.id, recurringDate: ymdToDate(date) }, select: { id: true } });
          if (exists) { summary.alreadyDone++; done = true; }
          // selain itu: tabrakan nomor transaksi (txId); percobaan kedua menghitung ulang nomornya
        }
      }
      if (!done) { summary.failed++; return; } // berhenti di sini; kemunculan ini dicoba lagi pada run berikutnya

      // Majukan jadwal. Bersyarat pada nextRunAt: bila run lain sudah memajukannya, tidak ada yang berubah.
      await prisma.recurringTransaction.updateMany({
        where: { id: it.id, nextRunAt: ymdToDate(date) },
        data: { nextRunAt: ymdToDate(nextAfter(start, freq, date)), lastRunAt: now },
      });
    }

    // Lewat tanggal akhir => selesai (nonaktifkan).
    if (end) {
      const fresh = await prisma.recurringTransaction.findUnique({ where: { id: it.id }, select: { nextRunAt: true, active: true } });
      if (fresh?.active && dateToYmd(fresh.nextRunAt) > end) {
        await prisma.recurringTransaction.updateMany({ where: { id: it.id, active: true }, data: { active: false } });
        summary.completed++;
      }
    }
  };

  const groups = [...byUser.values()];
  let next = 0;
  const worker = async () => {
    while (true) {
      if (Date.now() - startedAt > budgetMs) { summary.timeBudgetHit = true; return; }
      const group = groups[next++];
      if (!group) return;
      for (const it of group) await processItem(it);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, groups.length) }, worker));
  return summary;
}
