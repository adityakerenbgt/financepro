import { NextRequest, NextResponse } from 'next/server';
import { getDailyReport, getWeeklyReport, getMonthlyReport } from '@/lib/services';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // daily, weekly, monthly

    if (type === 'daily') {
      const date = searchParams.get('date');
      if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 });
      const report = await getDailyReport(user.userId, date);
      return NextResponse.json(report);
    }

    if (type === 'weekly') {
      const thisWeek = searchParams.get('thisWeek');
      const lastWeek = searchParams.get('lastWeek');
      if (!thisWeek || !lastWeek) {
        return NextResponse.json({ error: 'thisWeek and lastWeek are required' }, { status: 400 });
      }
      const report = await getWeeklyReport(user.userId, thisWeek, lastWeek);
      return NextResponse.json(report);
    }

    if (type === 'monthly') {
      const month = searchParams.get('month');
      if (!month) return NextResponse.json({ error: 'month is required' }, { status: 400 });
      const report = await getMonthlyReport(user.userId, month);
      return NextResponse.json(report);
    }

    return NextResponse.json({ error: 'type must be daily, weekly, or monthly' }, { status: 400 });
  } catch (error: any) {
    console.error('GET /api/reports error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
