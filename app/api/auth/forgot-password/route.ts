import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { rateLimit, getClientIp, tooManyRequests } from '@/lib/rateLimit';
import { createResetToken } from '@/lib/passwordReset';
import { sendEmail, appBaseUrl } from '@/lib/email';
import { resetPasswordEmail } from '@/lib/email/templates/resetPassword';

// Respons SELALU sama (200) untuk email terdaftar maupun tidak, agar tidak membocorkan siapa yang punya akun.
const GENERIC = {
  success: true,
  message: 'Jika email terdaftar, kami telah mengirim tautan untuk mengatur ulang password.',
};

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit('forgot', getClientIp(req), 5, 15 * 60);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // Input tak valid tidak mengungkap apa pun tentang akun, jadi boleh dibedakan.
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }

    // Batas per email mencegah email-bombing ke satu korban. Saat terlewati kita tetap membalas generik
    // (tanpa mengirim) supaya tidak ada perbedaan yang bisa dipakai menebak akun.
    const emailRl = await rateLimit('forgot-email', email, 3, 60 * 60);
    if (!emailRl.success) return NextResponse.json(GENERIC);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true, displayName: true },
    });
    if (user) {
      const token = await createResetToken(user.id);
      const lang = req.cookies.get('fp-lang')?.value === 'en' ? 'en' : 'id';
      const msg = resetPasswordEmail({ to: email, name: user.displayName || user.username, token, lang });
      const result = await sendEmail(msg);
      // Hanya di mode development tanpa Resend: tampilkan tautan di terminal agar alur bisa dicoba lokal.
      if (result.skipped && process.env.NODE_ENV === 'development') {
        console.log(`[dev] Tautan reset untuk ${email}: ${appBaseUrl()}/reset-password?token=${token}`);
      }
    }

    return NextResponse.json(GENERIC);
  } catch (error) {
    console.error('[forgot-password]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
