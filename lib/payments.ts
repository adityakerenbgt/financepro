import prisma from './db';
import { PAYMENT_PLANS, type PaymentPlanKey } from './plans';
import { extendedExpiry } from './plan';

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
