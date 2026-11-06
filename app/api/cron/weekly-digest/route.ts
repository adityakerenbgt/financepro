import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runWeeklyDigest } from '@/lib/digest';

// Dijadwalkan Senin-Rabu 01:00 UTC (08:00 WIB). Senin mengirim digest pekan lalu; Selasa/Rabu menuntaskan sisa batch
// dan mengulang yang gagal (penanda per pekan mencegah email ganda). Dilindungi CRON_SECRET.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await runWeeklyDigest());
  } catch (error) {
    console.error('[cron weekly-digest]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
