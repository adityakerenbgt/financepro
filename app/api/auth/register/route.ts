import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { rateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit';
import { seedDefaultCategories } from '@/lib/onboarding';
import { TRIAL_DAYS } from '@/lib/plans';
import { sendEmail } from '@/lib/email';
import { welcomeEmail } from '@/lib/email/templates/welcome';

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit('register', getClientIp(req), 5, 60 * 60);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const { username, displayName, password, confirmPassword, acceptTerms, email: rawEmail } = await req.json();
    // Email wajib (dipakai untuk reset password); disimpan huruf kecil agar unik tanpa peduli kapitalisasi.
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }
    if (acceptTerms !== true) {
      return NextResponse.json({ error: 'Kamu harus menyetujui Syarat & Ketentuan dan Kebijakan Privasi' }, { status: 400 });
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

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Trial PRO hanya diberikan di sini (saat akun dibuat), jadi satu akun tidak bisa mendapat trial dua kali.
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        displayName: displayName || null,
        password: hashedPassword,
        role: 'USER',
        plan: 'PRO',
        planExpiresAt: trialEndsAt,
        trialEndsAt,
        termsAcceptedAt: new Date(),
      },
      select: { id: true, username: true, displayName: true, plan: true },
    });

    // Kategori bawaan; gagal di sini tidak boleh menggagalkan pendaftaran (kategori juga dibuat otomatis saat dipakai).
    try {
      await seedDefaultCategories(user.id);
    } catch (err) {
      console.error('[register] seed kategori gagal:', err instanceof Error ? err.message : err);
    }

    // sendEmail tidak melempar error; kegagalan kirim tidak menggagalkan pendaftaran.
    const lang = req.cookies.get('fp-lang')?.value === 'en' ? 'en' : 'id';
    await sendEmail(welcomeEmail({ to: email, name: displayName || username, lang }));

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error('[register]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
