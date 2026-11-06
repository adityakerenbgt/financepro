import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth';
import { getAnalytics } from '@/lib/analytics';

// Metrik bisnis (hanya ADMIN). Akun ADMIN tidak dihitung; hanya role USER.
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdminUser(req);
    if (error) return error;
    return NextResponse.json(await getAnalytics());
  } catch (err) {
    console.error('[admin/analytics]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
