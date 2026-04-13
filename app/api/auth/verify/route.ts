import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-env';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: string };

    return NextResponse.json({ authenticated: true, username: decoded.username, role: decoded.role }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
