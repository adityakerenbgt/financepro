import { randomBytes } from 'crypto';
import { endOfDay, format, startOfDay } from 'date-fns';
import prisma from './db';
import { FREE_ACCOUNT_LIMIT } from './planLimits';
import { getMonthString, getWeekString, parseDate } from './utils';
import { todayWib } from './recurring';
import { duplicateKey, validateRow, type NormRow, type RawRow, type TypeMode } from './importParsing';

export const MAX_ROWS_PREVIEW = 1000; // batas baris per impor (pratinjau)
export const MAX_ROWS_PER_REQUEST = 500; // batas baris per permintaan impor sungguhan

export type RowStatus = 'ok' | 'duplicate' | 'invalid' | 'created';
export interface RowResult {
  ref: number;
  status: RowStatus;
  error?: string;
  // Hanya pada pratinjau untuk baris 'ok': kunci duplikat. Klien memakainya agar baris kembar yang sah selalu
  // dikirim dalam batch yang sama (kalau terpecah, kembaran kedua akan salah dianggap duplikat).
  key?: string;
}
export interface ImportOutcome {
  results: RowResult[];
  summary: { total: number; ok: number; duplicates: number; invalid: number; created: number };
  newCategories: string[];
  newAccounts: string[];
}

const FREE_LIMIT_MSG = `Paket FREE dibatasi ${FREE_ACCOUNT_LIMIT} rekening. Upgrade ke PRO untuk menambah rekening.`;
const lower = (s: string) => s.toLowerCase();

// Memproses impor transaksi (pratinjau bila dryRun). Aturan:
// - setiap baris divalidasi ULANG di server (klien tidak dipercaya); baris salah tidak menghalangi baris benar
// - nama kategori/rekening dicocokkan tanpa peduli huruf besar/kecil; yang belum ada dibuat. Paket FREE dibatasi
//   jumlah rekeningnya (baris yang butuh rekening baru melewati batas ditolak dengan pesan upgrade)
// - duplikat = tanggal + jenis + nominal + deskripsi yang sama dengan transaksi yang SUDAH ADA di database,
//   dihitung dengan jumlah kemunculan: file berisi 2 baris kembar dan DB sudah punya 1 -> hanya 1 yang diimpor.
//   Impor ulang file yang sama jadi semuanya duplikat (tidak menggandakan)
// - penulisan satu permintaan bersifat atomik: semua transaksi + penyesuaian saldo dalam satu $transaction
export async function processImport(opts: {
  userId: string;
  plan: 'FREE' | 'PRO';
  rows: RawRow[];
  typeMode: TypeMode;
  defaultAccount?: string;
  dryRun: boolean;
}): Promise<ImportOutcome> {
  const { userId, plan, rows, typeMode, defaultAccount, dryRun } = opts;
  const ctx = { typeMode, defaultAccount, todayYmd: todayWib() };

  const results: RowResult[] = rows.map(r => ({ ref: r.ref, status: 'ok' as RowStatus }));
  const norm: { i: number; row: NormRow }[] = [];
  rows.forEach((raw, i) => {
    const v = validateRow(raw, ctx);
    if (v.ok) norm.push({ i, row: v.value });
    else results[i] = { ref: raw.ref, status: 'invalid', error: v.error };
  });

  // --- kategori & rekening yang sudah ada (pencocokan tanpa peduli huruf besar/kecil) ---
  const [cats, accs] = await Promise.all([
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true } }),
    prisma.account.findMany({ where: { userId }, select: { id: true, name: true } }),
  ]);
  const catByLower = new Map(cats.map(c => [lower(c.name), c.name]));
  const accByLower = new Map(accs.map(a => [lower(a.name), a.name]));

  // Nama kanonik: yang sudah ada dipakai apa adanya; yang baru memakai penulisan pertama di file.
  const newAccountNames: string[] = [];
  const newCategoryNames: { name: string; type: 'income' | 'expense' }[] = [];
  const allowedNewAccounts = plan === 'FREE' ? Math.max(FREE_ACCOUNT_LIMIT - accs.length, 0) : Infinity;
  const blockedAccounts = new Set<string>();

  for (const { i, row } of norm) {
    const catKey = lower(row.category);
    if (!catByLower.has(catKey)) { catByLower.set(catKey, row.category); newCategoryNames.push({ name: row.category, type: row.type === 'Pemasukan' ? 'income' : 'expense' }); }
    row.category = catByLower.get(catKey)!;

    const accKey = lower(row.account);
    if (!accByLower.has(accKey) && !blockedAccounts.has(accKey)) {
      if (newAccountNames.length < allowedNewAccounts) { accByLower.set(accKey, row.account); newAccountNames.push(row.account); }
      else blockedAccounts.add(accKey);
    }
    if (blockedAccounts.has(accKey)) { results[i] = { ref: row.ref, status: 'invalid', error: FREE_LIMIT_MSG }; continue; }
    row.account = accByLower.get(accKey)!;
  }
  const live = norm.filter(({ i }) => results[i].status === 'ok');

  // --- duplikat terhadap database (hitungan kemunculan) ---
  if (live.length > 0) {
    const dates = live.map(({ row }) => row.date).sort();
    const existing = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfDay(parseDate(dates[0])), lte: endOfDay(parseDate(dates[dates.length - 1])) },
        amount: { in: [...new Set(live.map(({ row }) => row.amount))] },
      },
      select: { date: true, type: true, amount: true, description: true },
    });
    const counts = new Map<string, number>();
    for (const e of existing) {
      const k = duplicateKey(format(e.date, 'yyyy-MM-dd'), e.type, e.amount, e.description);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const { i, row } of live) {
      const k = duplicateKey(row.date, row.type, row.amount, row.description);
      const left = counts.get(k) ?? 0;
      if (left > 0) { counts.set(k, left - 1); results[i] = { ref: row.ref, status: 'duplicate', error: 'Sudah ada (tanggal, jenis, nominal, dan deskripsi sama)' }; }
    }
  }

  const toCreate = norm.filter(({ i }) => results[i].status === 'ok');
  if (dryRun) for (const { i, row } of toCreate) results[i] = { ref: row.ref, status: 'ok', key: duplicateKey(row.date, row.type, row.amount, row.description) };
  const usedNewCats = new Set(toCreate.map(({ row }) => lower(row.category)));
  const usedNewAccs = new Set(toCreate.map(({ row }) => lower(row.account)));
  const newCategories = newCategoryNames.filter(c => usedNewCats.has(lower(c.name))).map(c => c.name);
  const newAccounts = newAccountNames.filter(a => usedNewAccs.has(lower(a)));

  const summarize = (): ImportOutcome['summary'] => ({
    total: results.length,
    ok: results.filter(r => r.status === 'ok').length,
    duplicates: results.filter(r => r.status === 'duplicate').length,
    invalid: results.filter(r => r.status === 'invalid').length,
    created: results.filter(r => r.status === 'created').length,
  });

  if (dryRun || toCreate.length === 0) return { results, summary: summarize(), newCategories, newAccounts };

  // --- penulisan: buat kategori/rekening baru, lalu transaksi + saldo secara atomik ---
  const catsToCreate = newCategoryNames.filter(c => usedNewCats.has(lower(c.name)));
  if (catsToCreate.length) await prisma.category.createMany({ data: catsToCreate.map(c => ({ userId, name: c.name, type: c.type })), skipDuplicates: true });
  if (newAccounts.length) await prisma.account.createMany({ data: newAccounts.map(name => ({ userId, name })), skipDuplicates: true });

  const [catRows, accRows] = await Promise.all([
    prisma.category.findMany({ where: { userId, name: { in: [...new Set(toCreate.map(({ row }) => row.category))] } }, select: { id: true, name: true } }),
    prisma.account.findMany({ where: { userId, name: { in: [...new Set(toCreate.map(({ row }) => row.account))] } }, select: { id: true, name: true } }),
  ]);
  const catId = new Map(catRows.map(c => [lower(c.name), c.id]));
  const accId = new Map(accRows.map(a => [lower(a.name), a.id]));

  const deltas = new Map<string, number>();
  const data = toCreate.map(({ row }) => {
    const date = parseDate(row.date);
    const accountId = accId.get(lower(row.account))!;
    deltas.set(accountId, (deltas.get(accountId) ?? 0) + (row.type === 'Pemasukan' ? row.amount : -row.amount));
    return {
      txId: `IMP-${row.date.replace(/-/g, '')}-${randomBytes(4).toString('hex')}`, // unik per user; "IMP" menandai hasil impor
      userId, date, categoryId: catId.get(lower(row.category))!, description: row.description, accountId,
      type: row.type, amount: row.amount, note: row.note, month: getMonthString(date), week: getWeekString(date),
    };
  });

  await prisma.$transaction([
    prisma.transaction.createMany({ data }),
    ...[...deltas.entries()].map(([id, delta]) => prisma.account.update({ where: { id }, data: { balance: { increment: delta } } })),
  ]);

  for (const { i, row } of toCreate) results[i] = { ref: row.ref, status: 'created' };
  return { results, summary: summarize(), newCategories, newAccounts };
}
