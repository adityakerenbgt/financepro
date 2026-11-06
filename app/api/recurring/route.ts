import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requirePro } from '@/lib/auth';
import { rateLimit, tooManyRequests } from '@/lib/rateLimit';
import { addDays, dateToYmd, firstOnOrAfter, isValidYmd, todayWib, ymdToDate, type Frequency } from '@/lib/recurring';

// Transaksi berulang (fitur PRO). Pembuatan transaksinya dilakukan cron (lib/recurringEngine.ts).
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
const MAX_SCHEDULES = 50;
const MAX_AMOUNT = 1_000_000_000_000;

const SELECT = {
  id: true, type: true, amount: true, description: true, note: true, frequency: true,
  startDate: true, endDate: true, nextRunAt: true, lastRunAt: true, active: true,
  category: { select: { id: true, name: true } },
  account: { select: { id: true, name: true } },
} as const;

function serialize(r: any) {
  return {
    id: r.id, type: r.type, amount: r.amount, description: r.description, note: r.note, frequency: r.frequency,
    startDate: dateToYmd(r.startDate), endDate: r.endDate ? dateToYmd(r.endDate) : null,
    nextRunAt: dateToYmd(r.nextRunAt), lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
    active: r.active, category: r.category, account: r.account,
  };
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const rows = await prisma.recurringTransaction.findMany({
      where: { userId: auth.user.userId },
      select: SELECT,
      orderBy: [{ active: 'desc' }, { nextRunAt: 'asc' }],
    });
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    console.error('[recurring GET]', error instanceof Error ? error.message : error);
    return bad('Terjadi kesalahan server', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;

    const rl = await rateLimit('recurring-create', user.userId, 30, 60 * 60);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const b = await req.json().catch(() => ({}));
    const type = b?.type;
    const description = typeof b?.description === 'string' ? b.description.trim() : '';
    const note = typeof b?.note === 'string' && b.note.trim() ? b.note.trim() : null;
    const amount = typeof b?.amount === 'number' ? b.amount : typeof b?.amount === 'string' && b.amount.trim() !== '' ? Number(b.amount) : NaN;
    const { frequency, startDate, endDate, categoryId, accountId } = b ?? {};

    if (type !== 'Pemasukan' && type !== 'Pengeluaran') return bad('Jenis transaksi tidak valid');
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return bad('Nominal harus lebih dari 0');
    if (!description || description.length > 100) return bad('Deskripsi wajib diisi (maksimal 100 karakter)');
    if (note && note.length > 300) return bad('Catatan maksimal 300 karakter');
    if (!FREQUENCIES.includes(frequency)) return bad('Frekuensi tidak valid');
    if (typeof startDate !== 'string' || !isValidYmd(startDate)) return bad('Tanggal mulai tidak valid');
    if (endDate !== undefined && endDate !== null && endDate !== '' && (typeof endDate !== 'string' || !isValidYmd(endDate))) return bad('Tanggal akhir tidak valid');
    const end: string | null = endDate ? endDate : null;

    const today = todayWib();
    if (startDate < addDays(today, -366)) return bad('Tanggal mulai tidak boleh lebih dari 1 tahun yang lalu');
    if (startDate > addDays(today, 365 * 5)) return bad('Tanggal mulai terlalu jauh ke depan');
    if (end && end < startDate) return bad('Tanggal akhir tidak boleh sebelum tanggal mulai');

    // Rekening & kategori harus milik user ini.
    const [category, account, count] = await Promise.all([
      typeof categoryId === 'string' ? prisma.category.findFirst({ where: { id: categoryId, userId: user.userId }, select: { id: true } }) : null,
      typeof accountId === 'string' ? prisma.account.findFirst({ where: { id: accountId, userId: user.userId }, select: { id: true } }) : null,
      prisma.recurringTransaction.count({ where: { userId: user.userId } }),
    ]);
    if (!category) return bad('Kategori tidak ditemukan');
    if (!account) return bad('Rekening tidak ditemukan');
    if (count >= MAX_SCHEDULES) return bad(`Maksimal ${MAX_SCHEDULES} transaksi berulang`);

    const created = await prisma.recurringTransaction.create({
      data: {
        userId: user.userId, categoryId: category.id, accountId: account.id, type, amount, description, note,
        frequency: frequency as Frequency, startDate: ymdToDate(startDate), endDate: end ? ymdToDate(end) : null,
        nextRunAt: ymdToDate(startDate),
      },
      select: SELECT,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    console.error('[recurring POST]', error instanceof Error ? error.message : error);
    return bad('Terjadi kesalahan server', 500);
  }
}

// Jeda / lanjutkan. Jeda = jadwal yang lewat dilewati: saat dilanjutkan, nextRunAt dimajukan ke kemunculan pertama
// pada atau setelah hari ini (tidak mengejar periode yang dijeda).
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const b = await req.json().catch(() => ({}));
    const { id, active } = b ?? {};
    if (typeof id !== 'string' || !id) return bad('id wajib diisi');
    if (typeof active !== 'boolean') return bad('Nilai active harus true atau false');

    const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId: auth.user.userId } });
    if (!existing) return bad('Tidak ditemukan', 404);

    if (!active) {
      const r = await prisma.recurringTransaction.update({ where: { id }, data: { active: false }, select: SELECT });
      return NextResponse.json(serialize(r));
    }

    const start = dateToYmd(existing.startDate);
    const end = existing.endDate ? dateToYmd(existing.endDate) : null;
    const next = firstOnOrAfter(start, existing.frequency as Frequency, todayWib());
    if (end && next > end) return bad('Jadwal ini sudah berakhir');
    const r = await prisma.recurringTransaction.update({ where: { id }, data: { active: true, nextRunAt: ymdToDate(next) }, select: SELECT });
    return NextResponse.json(serialize(r));
  } catch (error) {
    console.error('[recurring PATCH]', error instanceof Error ? error.message : error);
    return bad('Terjadi kesalahan server', 500);
  }
}

// Menghapus jadwal. Transaksi yang sudah dibuat sebelumnya TIDAK ikut terhapus.
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const b = await req.json().catch(() => ({}));
    const id = b?.id;
    if (typeof id !== 'string' || !id) return bad('id wajib diisi');
    const res = await prisma.recurringTransaction.deleteMany({ where: { id, userId: auth.user.userId } });
    if (res.count === 0) return bad('Tidak ditemukan', 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[recurring DELETE]', error instanceof Error ? error.message : error);
    return bad('Terjadi kesalahan server', 500);
  }
}
