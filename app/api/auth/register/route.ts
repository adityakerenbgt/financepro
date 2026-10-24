import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { rateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit('register', getClientIp(req), 5, 60 * 60);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const { username, email, displayName, password, confirmPassword } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Password tidak cocok' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'Username hanya boleh huruf, angka, dan underscore' }, { status: 400 });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 409 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        displayName: displayName || null,
        password: hashedPassword,
        role: 'USER',
        plan: 'FREE',
      },
      select: { id: true, username: true, displayName: true, plan: true },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error('[register]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
