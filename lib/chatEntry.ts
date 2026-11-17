// Mengubah kalimat bebas ("makan siang 25rb pakai BCA") menjadi usulan transaksi. Murni (tanpa Node/DB).
// Dua sumber: parser aturan di sini (gratis, tanpa AI) dan model AI (lihat lib/receipt.ts). Keduanya DIVALIDASI oleh
// normalizeChatEntry, dan bot selalu meminta konfirmasi user sebelum menyimpan.
import { isValidYmd, todayWib } from './recurring';
import { toRupiah } from './receiptCore';
import { findDate, guessCategory } from './receiptText';

export type EntryType = 'Pemasukan' | 'Pengeluaran';
export interface ChatEntry { type: EntryType; amount: number; description: string; category: string; account: string; date: string }
export type EntryWarning = 'date_invalid' | 'category_unknown' | 'account_unknown';
export class EntryParseError extends Error {}

export interface EntryContext {
  categories: string[];
  accounts: string[];
  defaultAccount: string;
  today?: string;
}

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

// "25rb" "25 ribu" "25k" "1,5jt" "2 juta" "Rp25.000" "150000" -> Rupiah bulat. Angka kecil tanpa satuan (mis. "2 porsi") diabaikan.
export function findAmount(text: string): { value: number; raw: string } | null {
  const re = /(?<![\d/.-])(?:rp\.?\s*)?(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta)?(?![\w/])/gi;
  let best: { value: number; raw: string; unit: boolean } | null = null;
  for (const m of text.matchAll(re)) {
    const unit = m[2]?.toLowerCase();
    let value: number | null = null;
    if (unit) {
      const n = Number(m[1].replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      if (!Number.isFinite(n)) continue;
      const mult = unit === 'jt' || unit === 'juta' ? 1_000_000 : 1000;
      value = Math.round(n * mult);
    } else {
      const r = toRupiah(m[1]);
      value = r && r.value >= 500 ? r.value : null;
    }
    if (!value || value <= 0 || value > 1_000_000_000_000) continue;
    const cand = { value, raw: m[0], unit: !!unit };
    if (!best || (cand.unit && !best.unit) || (cand.unit === best.unit && cand.value > best.value)) best = cand;
  }
  return best ? { value: best.value, raw: best.raw.trim() } : null;
}

const INCOME_RE = /\b(gaji|gajian|terima|menerima|dapat|dapet|masuk|pemasukan|bonus|thr|komisi|honor|dibayar|dibayarin|jual|cashback|refund)\b/i;

function shiftDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// Parser aturan (tanpa AI). Mengembalikan null bila nominal tidak ditemukan.
export function parseChatHeuristic(text: string, ctx: EntryContext): Record<string, unknown> | null {
  const t = text.trim();
  const amt = findAmount(t);
  if (!amt) return null;
  const today = ctx.today ?? todayWib();

  let date = findDate(t) ?? '';
  if (!date) {
    if (/\bkemarin\b/i.test(t)) date = shiftDays(today, -1);
    else if (/\b(kemarin lusa|lusa kemarin)\b/i.test(t)) date = shiftDays(today, -2);
  }

  // rekening: nama rekening milik user yang disebut dalam kalimat (yang terpanjang menang)
  const account = [...ctx.accounts].sort((a, b) => b.length - a.length).find((a) => new RegExp(`(?<![\\p{L}\\p{N}])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(t));

  const type: EntryType = INCOME_RE.test(t) ? 'Pemasukan' : 'Pengeluaran';
  let category = guessCategory(t);
  if (type === 'Pemasukan' && /\b(gaji|gajian|thr|bonus|honor)\b/i.test(t)) category = 'Gaji';

  let desc = t.replace(amt.raw, ' ');
  if (account) desc = desc.replace(new RegExp(`\\b(pakai|pake|via|dari|dengan|ke|di)?\\s*${account.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'iu'), ' ');
  desc = desc.replace(/\b(kemarin|hari ini|tadi|barusan)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  if (desc) desc = desc[0].toUpperCase() + desc.slice(1);

  return { type, amount: amt.value, description: desc, category, account: account ?? '', date };
}

// Validasi KETAT usulan dari sumber mana pun. Tidak pernah membuat kategori/rekening baru dari teks bebas.
export function normalizeChatEntry(raw: unknown, ctx: EntryContext): { entry: ChatEntry; warnings: EntryWarning[] } {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const today = ctx.today ?? todayWib();
  const warnings: EntryWarning[] = [];

  const type = o.type === 'Pemasukan' || o.type === 'Pengeluaran' ? o.type : null;
  if (!type) throw new EntryParseError('Jenis transaksi tidak jelas');
  const amt = toRupiah(o.amount);
  if (!amt) throw new EntryParseError('Nominal tidak terbaca');

  let date = today;
  const rawDate = clean(o.date, 10);
  if (rawDate) {
    const t = Date.parse(`${rawDate}T00:00:00Z`), now = Date.parse(`${today}T00:00:00Z`);
    if (isValidYmd(rawDate) && t <= now + 86_400_000 && t >= now - 2 * 366 * 86_400_000) date = rawDate;
    else warnings.push('date_invalid');
  }

  const catWanted = clean(o.category, 100);
  const category = ctx.categories.find((c) => same(c, catWanted)) ?? 'Lainnya';
  if (!ctx.categories.some((c) => same(c, catWanted))) warnings.push('category_unknown');

  const accWanted = clean(o.account, 50);
  const accMatch = ctx.accounts.find((a) => same(a, accWanted));
  const account = accMatch ?? ctx.defaultAccount;
  if (accWanted && !accMatch) warnings.push('account_unknown');

  const description = clean(o.description, 200) || category;
  return { entry: { type, amount: amt.value, description, category, account, date }, warnings };
}
