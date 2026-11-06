import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminUser } from '@/lib/auth';
import { approvePayment, rejectPayment } from '@/lib/payments';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

// Daftar permintaan pembayaran (hanya ADMIN). ?status=PENDING|APPROVED|REJECTED|ALL (default PENDING).
// proofPath sengaja tidak dikembalikan; bukti dilihat lewat /api/admin/payments/[id]/proof (URL singkat).
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdminUser(req);
    if (error) return error;

    const param = new URL(req.url).searchParams.get('status')?.toUpperCase() ?? 'PENDING';
    const where = (STATUSES as readonly string[]).includes(param) ? { status: param as (typeof STATUSES)[number] } : {};

    const [items, grouped] = await Promise.all([
      prisma.paymentRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true, plan: true, amount: true, status: true, userNote: true, adminNote: true, createdAt: true, reviewedAt: true,
          user: { select: { id: true, username: true, displayName: true, email: true, plan: true, planExpiresAt: true } },
        },
      }),
      prisma.paymentRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const g of grouped) counts[g.status] = g._count._all;
    return NextResponse.json({ items, counts });
  } catch (err) {
    console.error('[admin/payments GET]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// Setujui / tolak. Body: { id, action: 'approve' | 'reject', adminNote? } (adminNote wajib saat reject).
export async function PATCH(req: NextRequest) {
  try {
    const { user: admin, error } = await requireAdminUser(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const { id, action, adminNote } = body ?? {};

    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
    }

    let result;
    if (action === 'approve') {
      result = await approvePayment(id, admin.userId);
    } else {
      const note = typeof adminNote === 'string' ? adminNote.trim() : '';
      if (!note) return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 });
      if (note.length > 500) return NextResponse.json({ error: 'Alasan maksimal 500 karakter' }, { status: 400 });
      result = await rejectPayment(id, admin.userId, note);
    }

    if (!result.ok) {
      return result.reason === 'not_found'
        ? NextResponse.json({ error: 'Permintaan tidak ditemukan' }, { status: 404 })
        : NextResponse.json({ error: 'Permintaan ini sudah diproses' }, { status: 409 });
    }
    return NextResponse.json({ success: true, planExpiresAt: result.planExpiresAt, planUnchanged: result.planUnchanged });
  } catch (err) {
    console.error('[admin/payments PATCH]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
