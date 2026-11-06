import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runRenewalReminders } from '@/lib/reminders';

// Dipanggil terjadwal oleh Vercel Cron (GET), dilindungi CRON_SECRET. Batas 50 email per run dengan jeda antar email;
// sisanya dikerjakan run berikutnya selama user masih berada di jendela pengingat.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await runRenewalReminders());
  } catch (error) {
    console.error('[cron renewal-reminders]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
