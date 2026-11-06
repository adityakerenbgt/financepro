// Parser & validator baris impor transaksi. Murni (tanpa database) sehingga bisa diuji tanpa DB.
//
// Aturan nominal: RUPIAH BULAT tanpa desimal. `parseCurrency` lama di utils.ts membuang titik dan koma sehingga
// "1.000,50" menjadi 100050 (salah diam-diam). Di sini nilai berdesimal DITOLAK dengan pesan jelas.

import { isValidYmd } from './recurring';

export type TypeMode = 'column' | 'allExpense' | 'allIncome' | 'sign';
export type TxType = 'Pemasukan' | 'Pengeluaran';

export const MAX_AMOUNT = 1_000_000_000_000;
export const MIN_DATE = '2000-01-01';

export interface RawRow {
  ref: number; // nomor baris di file (dikembalikan apa adanya pada hasil)
  date?: unknown;
  type?: unknown;
  amount?: unknown;
  category?: unknown;
  account?: unknown;
  description?: unknown;
  note?: unknown;
}

export interface NormRow {
  ref: number;
  date: string; // YYYY-MM-DD
  type: TxType;
  amount: number; // bilangan bulat positif (Rupiah)
  category: string;
  account: string;
  description: string;
  note: string | null;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const DECIMAL_ERR = 'Nominal harus bilangan bulat Rupiah (tanpa desimal)';

// Mengembalikan nilai BERTANDA (negatif bila diawali "-" atau di dalam kurung). Besarannya divalidasi pemanggil.
export function parseRupiah(raw: unknown): Parsed<number> {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { ok: false, error: 'Format nominal tidak valid' };
    if (!Number.isInteger(raw)) return { ok: false, error: DECIMAL_ERR };
    return { ok: true, value: raw };
  }
  if (typeof raw !== 'string') return { ok: false, error: 'Nominal kosong' };

  let s = raw.replace(/[ \s]/g, '');
  if (!s) return { ok: false, error: 'Nominal kosong' };

  // Tanda negatif (minus atau kurung) dan awalan mata uang boleh muncul dalam urutan apa pun: -Rp5.000, Rp-5.000, (Rp5.000)
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  for (let i = 0; i < 2; i++) {
    s = s.replace(/^(rp\.?|idr)/i, '');
    if (/^[-−–]/.test(s)) { negative = !negative; s = s.slice(1); }
  }
  if (!s) return { ok: false, error: 'Format nominal tidak valid' };

  let n: number | null = null;
  if (/^\d+$/.test(s)) n = Number(s); // 1500000
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) n = Number(s.replace(/\./g, '')); // 1.500.000
  else if (/^\d{1,3}(,\d{3})+$/.test(s)) n = Number(s.replace(/,/g, '')); // 1,500,000
  else if (/^(\d+|\d{1,3}(\.\d{3})+),0{1,2}$/.test(s)) n = Number(s.replace(/,0{1,2}$/, '').replace(/\./g, '')); // 1.500.000,00
  else if (/^(\d+|\d{1,3}(,\d{3})+)\.0{1,2}$/.test(s)) n = Number(s.replace(/\.0{1,2}$/, '').replace(/,/g, '')); // 1,500,000.00 / 1500000.00

  if (n === null) {
    // Ada pemisah desimal bernilai (mis. 1.500,50 / 1500.5 / 1,5) -> pesan khusus; selain itu format salah.
    return { ok: false, error: /^\d[\d.,]*$/.test(s) && /[.,]/.test(s) ? DECIMAL_ERR : 'Format nominal tidak valid' };
  }
  if (!Number.isSafeInteger(n)) return { ok: false, error: 'Nominal terlalu besar' };
  return { ok: true, value: negative ? -n : n };
}

const pad = (n: number) => String(n).padStart(2, '0');

// Menerima YYYY-MM-DD, YYYY-MM-DDTHH:mm..., dan DD/MM/YYYY (juga - atau . sebagai pemisah; hari lebih dulu).
export function parseImportDate(raw: unknown, todayYmd: string): Parsed<string> {
  if (typeof raw !== 'string') return { ok: false, error: 'Tanggal kosong' };
  const s = raw.trim();
  if (!s) return { ok: false, error: 'Tanggal kosong' };

  let y: number, m: number, d: number;
  let mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ]\d{1,2}:\d{2}.*)?$/);
  if (mt) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else if ((mt = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) { d = +mt[1]; m = +mt[2]; y = +mt[3]; }
  else return { ok: false, error: 'Format tanggal tidak dikenali (gunakan DD/MM/YYYY atau YYYY-MM-DD)' };

  const ymd = `${y}-${pad(m)}-${pad(d)}`;
  if (!isValidYmd(ymd)) return { ok: false, error: 'Tanggal tidak valid' };

  const maxYmd = new Date(new Date(`${todayYmd}T00:00:00Z`).getTime() + 366 * 86_400_000).toISOString().slice(0, 10);
  if (ymd < MIN_DATE || ymd > maxYmd) return { ok: false, error: 'Tanggal di luar rentang yang diizinkan' };
  return { ok: true, value: ymd };
}

const INCOME = new Set(['pemasukan', 'masuk', 'income', 'in', '+']);
const EXPENSE = new Set(['pengeluaran', 'keluar', 'expense', 'out', '-']);

export function normalizeType(raw: unknown): TxType | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  if (INCOME.has(s)) return 'Pemasukan';
  if (EXPENSE.has(s)) return 'Pengeluaran';
  return null;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').replace(/\s+/g, ' ').trim();

export interface RowContext {
  typeMode: TypeMode;
  defaultAccount?: string;
  todayYmd: string;
}

// Mengubah satu baris mentah menjadi baris bersih, atau memberi alasan penolakan (dalam Bahasa Indonesia).
export function validateRow(raw: RawRow, ctx: RowContext): Parsed<NormRow> {
  const date = parseImportDate(typeof raw.date === 'string' ? raw.date : raw.date == null ? '' : String(raw.date), ctx.todayYmd);
  if (!date.ok) return date;

  const amt = parseRupiah(raw.amount);
  if (!amt.ok) return amt;
  const signed = amt.value;
  const magnitude = Math.abs(signed);
  if (magnitude < 1) return { ok: false, error: 'Nominal harus lebih dari 0' };
  if (magnitude > MAX_AMOUNT) return { ok: false, error: 'Nominal terlalu besar' };

  let type: TxType;
  switch (ctx.typeMode) {
    case 'sign': type = signed < 0 ? 'Pengeluaran' : 'Pemasukan'; break;
    case 'allExpense': type = 'Pengeluaran'; break;
    case 'allIncome': type = 'Pemasukan'; break;
    case 'column': {
      const t = normalizeType(raw.type);
      if (!t) return { ok: false, error: str(raw.type) ? 'Jenis tidak dikenali (gunakan Pemasukan atau Pengeluaran)' : 'Jenis kosong' };
      type = t;
      break;
    }
    default: return { ok: false, error: 'Mode jenis tidak valid' };
  }
  // Nominal bertanda negatif hanya konsisten dengan pengeluaran.
  if (ctx.typeMode !== 'sign' && signed < 0 && type === 'Pemasukan') return { ok: false, error: 'Nominal negatif bertentangan dengan jenis Pemasukan' };

  const category = str(raw.category) || 'Lainnya';
  if (category.length > 50) return { ok: false, error: 'Nama kategori maksimal 50 karakter' };
  const account = str(raw.account) || str(ctx.defaultAccount);
  if (!account) return { ok: false, error: 'Rekening kosong' };
  if (account.length > 50) return { ok: false, error: 'Nama rekening maksimal 50 karakter' };
  const description = str(raw.description) || category;
  if (description.length > 200) return { ok: false, error: 'Deskripsi maksimal 200 karakter' };
  const note = str(raw.note) || null;
  if (note && note.length > 300) return { ok: false, error: 'Catatan maksimal 300 karakter' };

  return { ok: true, value: { ref: raw.ref, date: date.value, type, amount: magnitude, category, account, description, note } };
}

// Kunci pembanding duplikat: tanggal + nominal + deskripsi (+ jenis). Huruf besar/kecil diabaikan.
export function duplicateKey(date: string, type: TxType, amount: number, description: string): string {
  return `${date}|${type}|${amount}|${description.trim().toLowerCase()}`;
}
