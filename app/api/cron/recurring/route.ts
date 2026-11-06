import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runRecurring } from '@/lib/recurringEngine';

// Dijadwalkan harian 17:05 UTC (= 00:05 WIB, tepat setelah pergantian hari di WIB). Dilindungi CRON_SECRET.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await runRecurring());
  } catch (error) {
    console.error('[cron recurring]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
