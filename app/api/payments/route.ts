import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, tooManyRequests } from '@/lib/rateLimit';
import { PAYMENT_PLANS, type PaymentPlanKey } from '@/lib/plans';
import { StorageNotConfiguredError, isValidProofPath, proofExists } from '@/lib/storage';

const PUBLIC_FIELDS = {
  id: true, plan: true, amount: true, status: true, userNote: true, adminNote: true, createdAt: true, reviewedAt: true,
} as const; // proofPath sengaja tidak dikembalikan ke user

// Riwayat permintaan pembayaran milik sendiri.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const items = await prisma.paymentRequest.findMany({
      where: { userId: user.userId },
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('[payments GET]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// Langkah 2: setelah bukti terunggah, buat permintaan. Nominal dihitung server dari paket, bukan dari body.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit('pay-create', user.userId, 10, 60 * 60);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const body = await req.json().catch(() => ({}));
    const { plan, proofPath, userNote } = body ?? {};

    if (typeof plan !== 'string' || !(plan in PAYMENT_PLANS)) {
      return NextResponse.json({ error: 'Paket tidak valid' }, { status: 400 });
    }
    if (typeof proofPath !== 'string' || !isValidProofPath(user.userId, proofPath)) {
      return NextResponse.json({ error: 'Bukti pembayaran tidak valid' }, { status: 400 });
    }
    if (userNote !== undefined && userNote !== null && (typeof userNote !== 'string' || userNote.length > 500)) {
      return NextResponse.json({ error: 'Catatan maksimal 500 karakter' }, { status: 400 });
    }

    if (!(await proofExists(proofPath))) {
      return NextResponse.json({ error: 'Bukti pembayaran belum terunggah' }, { status: 400 });
    }

    const amount = PAYMENT_PLANS[plan as PaymentPlanKey].amount;
    try {
      // Serializable: dua permintaan serentak tidak bisa sama-sama lolos cek "maksimal 1 PENDING".
      const created = await prisma.$transaction(async (tx) => {
        const pending = await tx.paymentRequest.count({ where: { userId: user.userId, status: 'PENDING' } });
        if (pending > 0) return null;
        return tx.paymentRequest.create({
          data: { userId: user.userId, plan: plan as PaymentPlanKey, amount, proofPath, userNote: userNote?.trim() || null },
          select: PUBLIC_FIELDS,
        });
      }, { isolationLevel: 'Serializable' });

      if (!created) {
        return NextResponse.json({ error: 'Kamu masih punya permintaan pembayaran yang menunggu konfirmasi' }, { status: 409 });
      }
      return NextResponse.json(created, { status: 201 });
    } catch (error: any) {
      // P2034 = konflik serializable (permintaan serentak); P2002 = bukti yang sama dipakai dua kali
      if (error?.code === 'P2034') {
        return NextResponse.json({ error: 'Kamu masih punya permintaan pembayaran yang menunggu konfirmasi' }, { status: 409 });
      }
      if (error?.code === 'P2002') {
        return NextResponse.json({ error: 'Bukti pembayaran ini sudah dipakai' }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      console.error('[payments POST]', error.message);
      return NextResponse.json({ error: 'Unggah bukti belum tersedia saat ini. Silakan hubungi admin.' }, { status: 503 });
    }
    console.error('[payments POST]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
