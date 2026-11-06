import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, tooManyRequests } from '@/lib/rateLimit';
import {
  PROOF_MAX_BYTES, PROOF_TYPES, StorageNotConfiguredError, createProofUploadUrl, newProofPath,
} from '@/lib/storage';

// Langkah 1 pengajuan pembayaran: server memvalidasi jenis & ukuran file lalu memberi URL unggah bertanda tangan.
// Browser mengunggah langsung ke Supabase Storage (bucket privat); file tidak melewati server aplikasi.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit('pay-upload', user.userId, 10, 60 * 60);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const body = await req.json().catch(() => ({}));
    const { contentType, size } = body ?? {};

    if (typeof contentType !== 'string' || !(contentType in PROOF_TYPES)) {
      return NextResponse.json({ error: 'Jenis file tidak didukung (gunakan JPG, PNG, WEBP, atau PDF)' }, { status: 400 });
    }
    if (!Number.isInteger(size) || size <= 0) {
      return NextResponse.json({ error: 'Ukuran file tidak valid' }, { status: 400 });
    }
    if (size > PROOF_MAX_BYTES) {
      return NextResponse.json({ error: 'Ukuran file maksimal 2 MB' }, { status: 400 });
    }

    // Tidak ada gunanya mengunggah bila sudah ada permintaan yang menunggu.
    const pending = await prisma.paymentRequest.count({ where: { userId: user.userId, status: 'PENDING' } });
    if (pending > 0) {
      return NextResponse.json({ error: 'Kamu masih punya permintaan pembayaran yang menunggu konfirmasi' }, { status: 409 });
    }

    const path = newProofPath(user.userId, contentType);
    const { signedUrl, token } = await createProofUploadUrl(path);
    return NextResponse.json({ path, signedUrl, token });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      console.error('[payments/upload-url]', error.message);
      return NextResponse.json({ error: 'Unggah bukti belum tersedia saat ini. Silakan hubungi admin.' }, { status: 503 });
    }
    console.error('[payments/upload-url]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
