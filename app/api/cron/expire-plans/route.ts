import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isCronAuthorized } from '@/lib/cronAuth';

// Dipanggil terjadwal oleh Vercel Cron (GET). Vercel otomatis mengirim `Authorization: Bearer <CRON_SECRET>`
// bila env CRON_SECRET diset. Tanpa secret yang cocok => 401 (tertutup bila CRON_SECRET tidak diset).
export const dynamic = 'force-dynamic';

const RETENTION_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = new Date();

    // Turunkan PRO yang sudah lewat masa aktif. Idempoten. Tidak menyentuh ADMIN, FREE, maupun PRO tanpa
    // batas (planExpiresAt null = diatur manual oleh admin).
    const downgraded = await prisma.user.updateMany({
      where: { role: 'USER', plan: 'PRO', planExpiresAt: { lt: now } },
      data: { plan: 'FREE' },
    });

    // Rapikan token reset password yang sudah kedaluwarsa/terpakai lebih dari 24 jam lalu.
    const cutoff = new Date(now.getTime() - RETENTION_MS);
    const tokens = await prisma.passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }] },
    });

    return NextResponse.json({ downgraded: downgraded.count, tokensCleaned: tokens.count });
  } catch (error) {
    console.error('[cron expire-plans]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
