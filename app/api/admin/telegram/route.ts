import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth';
import { rateLimit, tooManyRequests } from '@/lib/rateLimit';
import { serverError } from '@/lib/apiError';
import { activateBot, deactivateBot, getBotStatus, resetBotUsernameCache } from '@/lib/telegramSetup';

export const dynamic = 'force-dynamic';

function baseUrl(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env && /^https?:\/\//.test(env)) return env;
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

// GET: status bot & webhook. POST {action: "activate" | "deactivate"}. Hanya ADMIN.
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdminUser(req);
    if (error) return error;
    return NextResponse.json(await getBotStatus(baseUrl(req)));
  } catch (e) { return serverError('admin/telegram', e); }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAdminUser(req);
    if (error) return error;
    const rl = await rateLimit('tg-setup', user.userId, 10, 600);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (action !== 'activate' && action !== 'deactivate') return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });

    const result = action === 'activate' ? await activateBot(baseUrl(req)) : await deactivateBot();
    resetBotUsernameCache();
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.reason }, { status: result.reason === 'telegram' ? 502 : 400 });
    return NextResponse.json({ success: true, status: await getBotStatus(baseUrl(req)) });
  } catch (e) { return serverError('admin/telegram', e); }
}
