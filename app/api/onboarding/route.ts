import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getOnboardingStatus, dismissOnboarding } from '@/lib/onboarding';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await getOnboardingStatus(user.userId));
  } catch (error) {
    console.error('[onboarding]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dismissOnboarding(user.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[onboarding]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
