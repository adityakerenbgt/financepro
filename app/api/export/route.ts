import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isPro } from '@/lib/auth';
import { rateLimit, tooManyRequests } from '@/lib/rateLimit';
import { DATE_RE, resolveDashboardRange } from '@/lib/dateRange';
import { build, fetchExportRows, idDate, MIME, rupiah, totalsOf, type ExportDoc, type ExportFormat } from '@/lib/export';

export const dynamic = 'force-dynamic';

const MONTH_RE = /^[A-Za-z]{3,4} \d{4}$/; // format yang dipakai Laporan, mis. "Nov 2026"
const clip = (s: string | null, n: number) => (s ?? '').trim().slice(0, n);

// GET /api/export?kind=transactions|monthly&format=csv|xlsx|pdf[&startDate&endDate&type&category&search | &month=Nov 2026]
// transactions: FREE dibatasi ke bulan berjalan (WIB), PRO bebas. monthly: khusus PRO (sama seperti Laporan).
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const rl = await rateLimit('export', user.userId, 20, 10 * 60);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const sp = new URL(req.url).searchParams;
    const format = sp.get('format') as ExportFormat;
    if (!['csv', 'xlsx', 'pdf'].includes(format)) return NextResponse.json({ error: 'Format tidak valid' }, { status: 400 });
    const kind = sp.get('kind') ?? 'transactions';
    if (kind !== 'transactions' && kind !== 'monthly') return NextResponse.json({ error: 'Jenis ekspor tidak valid' }, { status: 400 });

    const pro = isPro(user);
    let doc: ExportDoc;
    let filename: string;

    if (kind === 'monthly') {
      if (!pro) return NextResponse.json({ error: 'Fitur PRO', code: 'PRO_REQUIRED' }, { status: 403 });
      const month = clip(sp.get('month'), 20);
      if (!MONTH_RE.test(month)) return NextResponse.json({ error: 'Bulan tidak valid' }, { status: 400 });
      const { rows, truncated } = await fetchExportRows(user.userId, { month });
      const totals = totalsOf(rows);
      doc = {
        title: `Laporan Bulanan ${month}`, subtitle: `Dibuat ${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
        summary: [['Pemasukan', rupiah(totals.income)], ['Pengeluaran', rupiah(totals.expense)], ['Selisih', rupiah(totals.income - totals.expense)], ['Jumlah transaksi', String(rows.length)]],
        rows, totals, truncated,
      };
      filename = `laporan-${month.replace(/\s+/g, '-').toLowerCase()}`;
    } else {
      const startDate = sp.get('startDate') || undefined;
      const endDate = sp.get('endDate') || undefined;
      if ((startDate && !DATE_RE.test(startDate)) || (endDate && !DATE_RE.test(endDate))) {
        return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
      }
      const type = sp.get('type');
      if (type && type !== 'Pemasukan' && type !== 'Pengeluaran') return NextResponse.json({ error: 'Jenis tidak valid' }, { status: 400 });
      const range = resolveDashboardRange(pro ? 'PRO' : 'FREE', { startDate, endDate });
      const category = clip(sp.get('category'), 100), search = clip(sp.get('search'), 100);
      const { rows, truncated } = await fetchExportRows(user.userId, {
        startDate: range.startDate, endDate: range.endDate, type: type || undefined, category: category || undefined, search: search || undefined,
      });
      const totals = totalsOf(rows);
      const period = range.startDate || range.endDate ? `${range.startDate ? idDate(range.startDate) : '...'} - ${range.endDate ? idDate(range.endDate) : '...'}` : 'Semua periode';
      const filters = [type, category && `kategori: ${category}`, search && `cari: ${search}`].filter(Boolean).join(', ');
      doc = {
        title: 'Transaksi FinancePro', subtitle: `Periode ${period}${filters ? ` | ${filters}` : ''}${range.restricted ? ' | paket FREE: bulan berjalan' : ''}`,
        summary: [['Pemasukan', rupiah(totals.income)], ['Pengeluaran', rupiah(totals.expense)], ['Selisih', rupiah(totals.income - totals.expense)], ['Jumlah transaksi', String(rows.length)]],
        rows, totals, truncated,
      };
      filename = `transaksi-${new Date().toISOString().slice(0, 10)}`;
    }

    const body = await build(format, doc);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': MIME[format],
        'Content-Disposition': `attachment; filename="${filename}.${format}"`,
        'Cache-Control': 'no-store',
        ...(doc.truncated ? { 'X-Export-Truncated': '1' } : {}),
      },
    });
  } catch (error) {
    console.error('[export]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
