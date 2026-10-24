import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });

    return NextResponse.json({ authenticated: true, username: user.username, role: user.role, plan: user.plan }, { status: 200 });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
