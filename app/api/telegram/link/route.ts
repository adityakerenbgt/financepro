import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { createLinkCode, unlinkByUser } from '@/lib/telegramLink';

function fail(e: unknown) {
  console.error('[telegram/link]', e instanceof Error ? e.message : e);
  return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
}

// Status tautan akun ini
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const u = await prisma.user.findUnique({ where: { id: user.userId }, select: { telegramChatId: true } });
    return NextResponse.json({ linked: !!u?.telegramChatId, botUsername: process.env.TELEGRAM_BOT_USERNAME || null });
  } catch (e) { return fail(e); }
}

// Buat kode tautan 6 digit (berlaku 10 menit)
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const rl = await rateLimit('tg-code', user.userId, 10, 3600);
    if (!rl.success) return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 });
    const { code, expiresAt } = await createLinkCode(user.userId);
    return NextResponse.json({ code, expiresAt: expiresAt.toISOString(), botUsername: process.env.TELEGRAM_BOT_USERNAME || null });
  } catch (e) { return fail(e); }
}

// Putuskan tautan
export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await unlinkByUser(user.userId);
    return NextResponse.json({ success: true });
  } catch (e) { return fail(e); }
}
