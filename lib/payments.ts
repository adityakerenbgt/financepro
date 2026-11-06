import prisma from './db';
import { PAYMENT_PLANS, type PaymentPlanKey } from './plans';
import { extendedExpiry } from './plan';
import { sendEmail } from './email';
import { paymentApprovedEmail, paymentRejectedEmail } from './email/templates/paymentReview';

export type ReviewResult =
  | { ok: true; planExpiresAt: Date | null; planUnchanged: boolean }
  | { ok: false; reason: 'not_found' | 'already_processed' };

// Menyetujui pembayaran. Atomik & idempoten: permintaan "diklaim" lewat updateMany bersyarat (status masih PENDING),
// jadi persetujuan ganda/serentak hanya berhasil sekali dan masa aktif tidak bertambah dua kali.
export async function approvePayment(id: string, adminId: string, now: Date = new Date()): Promise<ReviewResult> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.paymentRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'APPROVED', reviewedAt: now, reviewedById: adminId },
    });
    if (claimed.count !== 1) {
      const exists = await tx.paymentRequest.findUnique({ where: { id }, select: { id: true } });
      return { ok: false, reason: exists ? 'already_processed' : 'not_found' } as const;
    }

    const req = await tx.paymentRequest.findUniqueOrThrow({ where: { id } });
    const user = await tx.user.findUniqueOrThrow({
      where: { id: req.userId },
      select: { role: true, plan: true, planExpiresAt: true },
    });

    // PRO tanpa batas (diatur manual admin) dan ADMIN tidak boleh "dipendekkan" menjadi berbatas waktu.
    const unlimited = user.role === 'ADMIN' || (user.plan === 'PRO' && user.planExpiresAt === null);
    if (unlimited) return { ok: true, planExpiresAt: user.planExpiresAt, planUnchanged: true } as const;

    const months = PAYMENT_PLANS[req.plan as PaymentPlanKey].months;
    const planExpiresAt = extendedExpiry(user.planExpiresAt, months, now);
    await tx.user.update({ where: { id: req.userId }, data: { plan: 'PRO', planExpiresAt } });
    return { ok: true, planExpiresAt, planUnchanged: false } as const;
  });
}

// Menolak pembayaran (alasan wajib diisi oleh pemanggil). Hanya untuk permintaan yang masih PENDING.
export async function rejectPayment(id: string, adminId: string, adminNote: string, now: Date = new Date()): Promise<ReviewResult> {
  const res = await prisma.paymentRequest.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'REJECTED', adminNote, reviewedAt: now, reviewedById: adminId },
  });
  if (res.count === 1) return { ok: true, planExpiresAt: null, planUnchanged: true };
  const exists = await prisma.paymentRequest.findUnique({ where: { id }, select: { id: true } });
  return { ok: false, reason: exists ? 'already_processed' : 'not_found' };
}

export type EmailStatus = 'sent' | 'skipped' | 'failed' | 'no_email';

// Memberi tahu user hasil peninjauan lewat email. Tidak pernah melempar error: kegagalan kirim tidak boleh
// membatalkan persetujuan/penolakan yang sudah tersimpan. Statusnya dikembalikan agar admin tahu.
export async function notifyPaymentReviewed(id: string, action: 'approve' | 'reject', planExpiresAt: Date | null): Promise<EmailStatus> {
  try {
    const pr = await prisma.paymentRequest.findUnique({
      where: { id },
      select: { plan: true, amount: true, adminNote: true, user: { select: { email: true, username: true, displayName: true } } },
    });
    if (!pr || !pr.user.email) return 'no_email';
    const name = pr.user.displayName || pr.user.username;
    const plan = pr.plan as PaymentPlanKey;
    const msg = action === 'approve'
      ? paymentApprovedEmail({ to: pr.user.email, name, plan, amount: pr.amount, planExpiresAt })
      : paymentRejectedEmail({ to: pr.user.email, name, plan, amount: pr.amount, reason: pr.adminNote ?? '-' });
    const res = await sendEmail(msg);
    return res.ok ? 'sent' : res.skipped ? 'skipped' : 'failed';
  } catch (err) {
    console.error('[payments] gagal menyiapkan email notifikasi:', err instanceof Error ? err.message : err);
    return 'failed';
  }
}
