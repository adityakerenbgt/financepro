// Inti pembacaan nota yang MURNI (tanpa Node/DB), dipakai server (hasil Gemini) dan browser (hasil OCR di perangkat).
// Output sumber mana pun hanya dianggap usulan: divalidasi di sini, lalu dikonfirmasi user sebelum disimpan.
import { isValidYmd, todayWib } from './recurring';

const MAX_AMOUNT = 1_000_000_000_000;
const FALLBACK_CATEGORY = 'Lainnya';

export class ReceiptReadError extends Error {}

export interface ReceiptDraft {
  date: string; // YYYY-MM-DD
  amount: number; // Rupiah bulat > 0 (0 = belum terbaca, hanya bila allowMissingTotal)
  merchant: string;
  category: string; // salah satu kategori milik user
  items: { name: string; amount: number }[];
}
export type ReceiptWarning = 'date_missing' | 'date_invalid' | 'category_unknown' | 'amount_rounded' | 'amount_missing';
export interface NormalizedReceipt { draft: ReceiptDraft; warnings: ReceiptWarning[] }

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

// Angka Rupiah dari number atau teks ("Rp 25.000", "25,000", "25000.00"). Hasil dibulatkan; null bila tak bisa dibaca.
export function toRupiah(v: unknown): { value: number; rounded: boolean } | null {
  let n: number;
  if (typeof v === 'number') n = v;
  else if (typeof v === 'string') {
    const s = v.replace(/[^\d.,-]/g, '');
    if (!s) return null;
    // pemisah ribuan (titik/koma diikuti tepat 3 digit) dibuang; sisanya dianggap desimal
    const normalized = s.replace(/[.,](?=\d{3}(?:[.,]|$))/g, '').replace(',', '.');
    n = Number(normalized);
  } else return null;
  if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) return null;
  const value = Math.round(n);
  return value > 0 ? { value, rounded: value !== n } : null;
}

// Memvalidasi & merapikan hasil mentah model. Melempar ReceiptReadError bila total tidak terbaca.
export function normalizeReceipt(raw: unknown, ctx: { categories: string[]; today?: string; allowMissingTotal?: boolean }): NormalizedReceipt {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const today = ctx.today ?? todayWib();
  const warnings: ReceiptWarning[] = [];

  const total = toRupiah(o.total);
  if (!total && !ctx.allowMissingTotal) throw new ReceiptReadError('Total belanja tidak terbaca');
  if (!total) warnings.push('amount_missing');
  else if (total.rounded) warnings.push('amount_rounded');

  // Tanggal: harus tanggal kalender valid, tidak di masa depan (> besok, toleransi zona waktu), dan tidak lebih dari ~2 tahun lalu.
  let date = today;
  const rawDate = clean(o.date, 10);
  if (!rawDate) warnings.push('date_missing');
  else if (!isValidYmd(rawDate)) warnings.push('date_invalid');
  else {
    const t = Date.parse(`${rawDate}T00:00:00Z`), now = Date.parse(`${today}T00:00:00Z`);
    if (t > now + 86_400_000 || t < now - 2 * 366 * 86_400_000) warnings.push('date_invalid');
    else date = rawDate;
  }

  // Kategori: hanya yang ada di daftar user (cocok tanpa peduli huruf besar/kecil), selain itu "Lainnya"/kosong.
  const wanted = clean(o.category, 100).toLowerCase();
  const match = ctx.categories.find((c) => c.toLowerCase() === wanted);
  const fallback = ctx.categories.find((c) => c === FALLBACK_CATEGORY) ?? '';
  if (!match) warnings.push('category_unknown');

  const items: { name: string; amount: number }[] = [];
  if (Array.isArray(o.items)) {
    for (const it of o.items.slice(0, 30)) {
      const row = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>;
      const name = clean(row.name, 100), amt = toRupiah(row.amount);
      if (name && amt) items.push({ name, amount: amt.value });
    }
  }

  return {
    draft: { date, amount: total ? total.value : 0, merchant: clean(o.merchant, 100), category: match ?? fallback, items },
    warnings,
  };
}

