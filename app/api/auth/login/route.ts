import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEffectivePlan } from '@/lib/plan';
import { rateLimit, resetRateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit';

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_SEC = 15 * 60;

import { JWT_SECRET } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password harus diisi' }, { status: 400 });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const rlKey = `${getClientIp(req)}:${username.toLowerCase()}`;
    const rl = await rateLimit('login', rlKey, LOGIN_LIMIT, LOGIN_WINDOW_SEC);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    await resetRateLimit('login', rlKey, LOGIN_LIMIT, LOGIN_WINDOW_SEC);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const response = NextResponse.json({
      success: true,
      username: user.username,
      role: user.role,
      plan: getEffectivePlan(user),
    }, { status: 200 });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[login]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
