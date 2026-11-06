import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { rateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit';
import { verifyUnsubscribeToken } from '@/lib/digestToken';

// Berhenti berlangganan digest TANPA login, memakai token bertanda tangan dari email.
// POST agar pemindai tautan email tidak berhenti-berlangganan-kan user secara tidak sengaja; halaman /unsubscribe
// menampilkan tombol konfirmasi. Juga melayani one-click (RFC 8058): penyedia email mengirim POST ke URL List-Unsubscribe.
export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit('unsubscribe', getClientIp(req), 20, 60 * 60);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const url = new URL(req.url);
    let u = url.searchParams.get('u') ?? '';
    let t = url.searchParams.get('t') ?? '';
    if (!u || !t) {
      const body = await req.json().catch(() => ({}));
      u = typeof body?.u === 'string' ? body.u : u;
      t = typeof body?.t === 'string' ? body.t : t;
    }

    if (!verifyUnsubscribeToken(u, t)) {
      return NextResponse.json({ error: 'Tautan tidak valid' }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { id: u }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: 'Tautan tidak valid' }, { status: 400 });

    await prisma.userProfile.upsert({
      where: { userId: u },
      update: { emailDigest: false },
      create: { userId: u, name: 'User', emailDigest: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[digest unsubscribe]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
