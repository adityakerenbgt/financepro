import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isPro } from '@/lib/auth';
import { rateLimit, tooManyRequests } from '@/lib/rateLimit';
import { MAX_ROWS_PER_REQUEST, MAX_ROWS_PREVIEW, processImport } from '@/lib/importer';
import type { RawRow, TypeMode } from '@/lib/importParsing';

// Impor transaksi dari CSV/Excel. Klien mem-parsing file dan memetakan kolom; SERVER memvalidasi ulang setiap baris.
// dryRun=true -> pratinjau (tidak menulis apa pun, maks. 1.000 baris); dryRun=false -> impor sungguhan (maks. 500 baris
// per permintaan, atomik). Tersedia untuk semua paket; paket FREE tetap dibatasi jumlah rekeningnya.
export const maxDuration = 60;

const MODES: TypeMode[] = ['column', 'allExpense', 'allIncome', 'sign'];
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return bad('Unauthorized', 401);

    const rl = await rateLimit('import', user.userId, 60, 60 * 60);
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return bad('Permintaan tidak valid');
    const { rows, typeMode, defaultAccount } = body as { rows?: unknown; typeMode?: unknown; defaultAccount?: unknown };
    const dryRun = (body as any).dryRun !== false; // aman secara bawaan: hanya menulis bila dryRun === false

    if (!Array.isArray(rows) || rows.length === 0) return bad('Tidak ada baris untuk diproses');
    const limit = dryRun ? MAX_ROWS_PREVIEW : MAX_ROWS_PER_REQUEST;
    if (rows.length > limit) return bad(`Maksimal ${limit.toLocaleString('id-ID')} baris per ${dryRun ? 'impor' : 'permintaan'}`);
    if (!MODES.includes(typeMode as TypeMode)) return bad('Mode jenis tidak valid');
    if (defaultAccount !== undefined && defaultAccount !== null && typeof defaultAccount !== 'string') return bad('Rekening bawaan tidak valid');

    // Hanya properti yang dikenal yang diteruskan; nomor baris (ref) default ke urutan.
    const clean: RawRow[] = rows.map((r: any, i: number) => ({
      ref: Number.isInteger(r?.ref) ? r.ref : i + 1,
      date: r?.date, type: r?.type, amount: r?.amount, category: r?.category, account: r?.account, description: r?.description, note: r?.note,
    }));

    const out = await processImport({
      userId: user.userId,
      plan: isPro(user) ? 'PRO' : 'FREE',
      rows: clean,
      typeMode: typeMode as TypeMode,
      defaultAccount: typeof defaultAccount === 'string' ? defaultAccount : undefined,
      dryRun,
    });
    return NextResponse.json(out);
  } catch (error) {
    console.error('[import transactions]', error instanceof Error ? error.message : error);
    return bad('Terjadi kesalahan server', 500);
  }
}
