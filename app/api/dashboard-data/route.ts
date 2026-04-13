import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/services';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const data = await getDashboardData(
      user.userId,
      searchParams.get('startDate') || undefined,
      searchParams.get('endDate') || undefined,
    );
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
