import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminUser } from '@/lib/auth';
import { StorageNotConfiguredError, createProofViewUrl } from '@/lib/storage';

const VIEW_SECONDS = 60;

// Mengembalikan signed URL berumur pendek (60 dtk) untuk melihat bukti pembayaran. Hanya ADMIN.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireAdminUser(req);
    if (error) return error;

    const pr = await prisma.paymentRequest.findUnique({ where: { id: params.id }, select: { proofPath: true } });
    if (!pr) return NextResponse.json({ error: 'Permintaan tidak ditemukan' }, { status: 404 });

    const url = await createProofViewUrl(pr.proofPath, VIEW_SECONDS);
    return NextResponse.json({ url, expiresInSeconds: VIEW_SECONDS });
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: 'Penyimpanan bukti belum dikonfigurasi' }, { status: 503 });
    }
    console.error('[admin/payments proof]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
