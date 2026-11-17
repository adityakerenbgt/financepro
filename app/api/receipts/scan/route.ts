import { NextRequest, NextResponse } from 'next/server';
import { requirePro } from '@/lib/auth';
import prisma from '@/lib/db';
import { rateLimit, tooManyRequests } from '@/lib/rateLimit';
import {
  GeminiNotConfiguredError, MAX_IMAGE_BYTES, ReceiptReadError, normalizeReceipt, readReceiptWithGemini, sniffImageMime,
} from '@/lib/receipt';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// POST multipart/form-data (field "file": JPEG/PNG/WebP, maks. 4 MB) -> { draft, warnings }.
// Khusus PRO. TIDAK menyimpan apa pun (gambar maupun hasilnya); user mengonfirmasi lalu menyimpan lewat /api/transactions.
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requirePro(req);
    if (error) return error;

    // Biaya & kuota API: 20 foto per jam dan 60 per hari per user
    const [h, d] = await Promise.all([
      rateLimit('receipt-h', user.userId, 20, 3600),
      rateLimit('receipt-d', user.userId, 60, 86400),
    ]);
    if (!h.success || !d.success) return tooManyRequests(Math.max(h.retryAfter, d.retryAfter));

    const declared = Number(req.headers.get('content-length') ?? 0);
    if (declared > MAX_IMAGE_BYTES + 64 * 1024) return NextResponse.json({ error: 'Foto terlalu besar (maksimal 4 MB)' }, { status: 413 });

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'Foto nota wajib diunggah' }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: 'File kosong' }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Foto terlalu besar (maksimal 4 MB)' }, { status: 413 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = sniffImageMime(bytes);
    if (!mime) return NextResponse.json({ error: 'Format foto harus JPEG, PNG, atau WebP' }, { status: 400 });

    const cats = await prisma.category.findMany({ where: { userId: user.userId, type: { in: ['expense', 'both'] } }, select: { name: true }, orderBy: { name: 'asc' } });
    const categories = cats.map((c) => c.name);
    if (!categories.includes('Lainnya')) categories.push('Lainnya');

    const raw = await readReceiptWithGemini(bytes, mime, categories);
    const result = normalizeReceipt(raw, { categories });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      console.error('[receipts/scan] GEMINI_API_KEY belum diset');
      return NextResponse.json({ error: 'Fitur scan nota belum aktif. Silakan hubungi admin.' }, { status: 503 });
    }
    if (err instanceof ReceiptReadError) {
      console.error('[receipts/scan]', err.message);
      const unreadable = err.message === 'Total belanja tidak terbaca';
      return NextResponse.json(
        { error: unreadable ? 'Nota tidak terbaca. Coba foto lebih jelas dan lurus, atau isi manual.' : 'Layanan pembaca nota sedang bermasalah. Coba lagi sebentar lagi.', code: unreadable ? 'UNREADABLE' : 'UPSTREAM' },
        { status: unreadable ? 422 : 502 },
      );
    }
    console.error('[receipts/scan]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
