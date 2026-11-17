// Telegram webhook. Wajib memakai secret token (header X-Telegram-Bot-Api-Secret-Token) yang diset saat setWebhook;
// tanpa TELEGRAM_BOT_TOKEN endpoint menolak semua permintaan (fail closed). Rahasia dibuat otomatis (lib/telegramSetup.ts).

import { NextRequest, NextResponse } from 'next/server';
import { createBot } from '@/lib/telegramBot';
import { webhookCallback } from 'grammy';
import { timingSafeEqual } from 'crypto';
import { webhookSecret } from '@/lib/telegramSetup';

export const dynamic = 'force-dynamic';

let handler: ((req: Request) => Promise<Response>) | null = null;
let handlerSecret = '';

function getHandler(secret: string) {
  if (!handler || handlerSecret !== secret) {
    handler = webhookCallback(createBot(), 'std/http', { secretToken: secret });
    handlerSecret = secret;
  }
  return handler;
}

export async function POST(req: NextRequest) {
  // Rahasia diturunkan dari TELEGRAM_BOT_TOKEN (atau env TELEGRAM_WEBHOOK_SECRET bila diisi). Tanpa token: ditutup (fail closed).
  const secret = webhookSecret();
  if (!secret) return NextResponse.json({ error: 'Webhook belum dikonfigurasi' }, { status: 503 });
  // Verifikasi secret SEBELUM menyentuh bot (menghindari panggilan getMe & pemrosesan untuk pemanggil tak sah)
  const given = Buffer.from(req.headers.get('x-telegram-bot-api-secret-token') ?? '');
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return await getHandler(secret)(req);
  } catch (error) {
    console.error('Webhook error:', error instanceof Error ? error.message : error);
    // 200 agar Telegram tidak mengulang update yang bermasalah
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
