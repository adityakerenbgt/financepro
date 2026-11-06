import prisma from './db';
import { isTrial } from './plan';
import { sendEmail } from './email';
import { renewalReminderEmail } from './email/templates/renewalReminder';

const DAY = 24 * 60 * 60 * 1000;

// Jendela pengingat sebelum masa aktif habis. Trial lebih singkat agar user baru tidak "diingatkan" saat baru daftar.
export const PAID_WINDOW_DAYS = 3;
export const TRIAL_WINDOW_DAYS = 1;

export interface ReminderSummary {
  eligible: number; // memenuhi syarat & belum diingatkan pada run ini
  sent: number;
  skipped: number; // layanan email belum dikonfigurasi (tidak ditandai, dicoba lagi nanti)
  failed: number; // gagal kirim (tanda dibatalkan, dicoba lagi pada run berikutnya selama masih di jendela)
}

// Mengirim pengingat perpanjangan. Aturan:
// - hanya role USER + plan PRO yang masa aktifnya (belum lewat) berakhir dalam jendela, dan punya email
// - satu email per periode: planExpiresAt yang sudah diingatkan disimpan di renewalReminderSentFor
//   (perpanjangan mengubah planExpiresAt, jadi periode baru boleh diingatkan lagi)
// - "diklaim" dulu secara atomik (updateMany bersyarat) baru dikirim, sehingga run serentak tidak mengirim ganda
// - bila kirim gagal / dilewati, klaim dibatalkan supaya run berikutnya mencoba lagi
export async function runRenewalReminders(
  now: Date = new Date(),
  opts: { batchLimit?: number; delayMs?: number } = {},
): Promise<ReminderSummary> {
  const batchLimit = opts.batchLimit ?? 50;
  const delayMs = opts.delayMs ?? 500; // jeda antar email agar tidak melewati batas laju penyedia email

  const candidates = await prisma.user.findMany({
    where: {
      role: 'USER',
      plan: 'PRO',
      email: { not: null },
      planExpiresAt: { gt: now, lte: new Date(now.getTime() + PAID_WINDOW_DAYS * DAY) },
    },
    select: {
      id: true, email: true, username: true, displayName: true, role: true, plan: true,
      planExpiresAt: true, trialEndsAt: true, renewalReminderSentFor: true,
    },
    orderBy: { planExpiresAt: 'asc' }, // yang paling mendesak lebih dulu
  });

  const due = candidates.filter(u => {
    const expiresAt = u.planExpiresAt!;
    if (u.renewalReminderSentFor && u.renewalReminderSentFor.getTime() === expiresAt.getTime()) return false;
    const trial = isTrial(u, now);
    const windowMs = (trial ? TRIAL_WINDOW_DAYS : PAID_WINDOW_DAYS) * DAY;
    return expiresAt.getTime() - now.getTime() <= windowMs;
  }).slice(0, batchLimit);

  const summary: ReminderSummary = { eligible: due.length, sent: 0, skipped: 0, failed: 0 };

  for (const u of due) {
    const expiresAt = u.planExpiresAt!;
    const previous = u.renewalReminderSentFor;

    const claimed = await prisma.user.updateMany({
      where: {
        id: u.id,
        plan: 'PRO',
        planExpiresAt: expiresAt,
        OR: [{ renewalReminderSentFor: null }, { renewalReminderSentFor: { not: expiresAt } }],
      },
      data: { renewalReminderSentFor: expiresAt },
    });
    if (claimed.count !== 1) continue; // sudah diklaim run lain, atau plan berubah di tengah jalan

    const msg = renewalReminderEmail({
      to: u.email!,
      name: u.displayName || u.username,
      kind: isTrial(u, now) ? 'trial' : 'paid',
      expiresAt,
      daysLeft: Math.ceil((expiresAt.getTime() - now.getTime()) / DAY),
    });
    const res = await sendEmail(msg);

    if (res.ok) {
      summary.sent++;
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    } else {
      // Batalkan klaim (hanya bila masih milik kita) supaya dicoba lagi pada run berikutnya.
      await prisma.user.updateMany({ where: { id: u.id, renewalReminderSentFor: expiresAt }, data: { renewalReminderSentFor: previous } });
      if (res.skipped) summary.skipped++;
      else summary.failed++;
    }
  }
  return summary;
}
