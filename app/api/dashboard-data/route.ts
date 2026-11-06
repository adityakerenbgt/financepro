import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/services';
import { getCurrentUser, isPro } from '@/lib/auth';
import { DATE_RE, resolveDashboardRange } from '@/lib/dateRange';

export async function GET(req: NextRequest) {
  try {
    // Plan diambil dari DB (bukan JWT) supaya pembatasan FREE berlaku seketika, termasuk setelah trial/PRO habis.
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    if ((startDate && !DATE_RE.test(startDate)) || (endDate && !DATE_RE.test(endDate))) {
      return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 });
    }

    // FREE: rentang dipaksa ke bulan berjalan (WIB); parameter klien diabaikan. Penanda `range` dikirim ke UI.
    const range = resolveDashboardRange(isPro(user) ? 'PRO' : 'FREE', { startDate, endDate });
    const data = await getDashboardData(user.userId, range.startDate, range.endDate);
    return NextResponse.json({
      ...data,
      range: { startDate: range.startDate, endDate: range.endDate, restricted: range.restricted, adjusted: range.adjusted },
    });
  } catch (error: any) {
    console.error('[dashboard-data]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
