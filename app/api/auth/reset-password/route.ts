import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit';
import { consumeResetToken, MIN_PASSWORD_LENGTH } from '@/lib/passwordReset';

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit('reset', getClientIp(req), 10, 15 * 60);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const body = await req.json().catch(() => ({}));
    const { token, password, confirmPassword } = body ?? {};

    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json({ error: 'Tautan tidak valid atau sudah kedaluwarsa' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Password tidak cocok' }, { status: 400 });
    }

    // Token tak dikenal, kedaluwarsa, atau sudah dipakai: satu pesan yang sama.
    const ok = await consumeResetToken(token, password);
    if (!ok) {
      return NextResponse.json({ error: 'Tautan tidak valid atau sudah kedaluwarsa' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[reset-password]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
