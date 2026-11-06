// Matematika jadwal transaksi berulang. Murni (tanpa database), semua tanggal berupa string 'YYYY-MM-DD'
// (tanggal kalender, tanpa zona waktu) sehingga hasilnya sama di server UTC maupun WIB.
//
// Kemunculan ke-k SELALU dihitung dari tanggal MULAI, bukan dari kemunculan sebelumnya. Dengan begitu jadwal bulanan
// yang mulai 31 Jan menjadi: 31 Jan, 28 Feb, 31 Mar, 30 Apr (kembali ke 31 setelah bulan pendek), bukan 31 Jan, 28 Feb,
// 28 Mar, 28 Apr.

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export const MAX_CATCH_UP = 31; // maksimum kemunculan yang dibuat per jadwal dalam satu kali jalan

const DAY_MS = 86_400_000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');

export const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(s: string): boolean {
  if (!YMD_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function parts(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}
const fmt = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1..12
const toMs = (s: string) => { const { y, m, d } = parts(s); return Date.UTC(y, m - 1, d); };
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(s: string, n: number): string {
  return fromMs(toMs(s) + n * DAY_MS);
}

function diffDays(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / DAY_MS);
}

// Menambah `n` bulan pada tanggal MULAI, dengan hari dipangkas ke hari terakhir bulan tujuan.
function addMonthsClamped(start: string, n: number): string {
  const { y, m, d } = parts(start);
  const total = y * 12 + (m - 1) + n;
  const ty = Math.floor(total / 12);
  const tm = (total % 12) + 1;
  return fmt(ty, tm, Math.min(d, daysInMonth(ty, tm)));
}

// Kemunculan ke-k (k = 0 adalah tanggal mulai).
export function occurrenceAt(start: string, frequency: Frequency, k: number): string {
  switch (frequency) {
    case 'DAILY': return addDays(start, k);
    case 'WEEKLY': return addDays(start, 7 * k);
    case 'MONTHLY': return addMonthsClamped(start, k);
    case 'YEARLY': return addMonthsClamped(start, 12 * k);
  }
}

// Kemunculan pertama yang jatuh pada atau setelah `date`.
export function firstOnOrAfter(start: string, frequency: Frequency, date: string): string {
  if (date <= start) return start;
  const s = parts(start), t = parts(date);
  let k: number;
  switch (frequency) {
    case 'DAILY': k = diffDays(start, date); break;
    case 'WEEKLY': k = Math.ceil(diffDays(start, date) / 7); break;
    case 'MONTHLY': k = (t.y - s.y) * 12 + (t.m - s.m); break;
    case 'YEARLY': k = t.y - s.y; break;
  }
  let occ = occurrenceAt(start, frequency, k);
  if (occ < date) occ = occurrenceAt(start, frequency, k + 1);
  return occ;
}

// Kemunculan berikutnya setelah `current` (current dianggap sebuah kemunculan).
export function nextAfter(start: string, frequency: Frequency, current: string): string {
  return firstOnOrAfter(start, frequency, addDays(current, 1));
}

// Tanggal hari ini menurut WIB (UTC+7), terlepas dari zona waktu server.
export function todayWib(now: Date = new Date()): string {
  return fromMs(now.getTime() + WIB_OFFSET_MS);
}

// Kemunculan yang jatuh tempo: mulai dari `from`, sampai `today` (dan `endDate` bila ada), maksimum `limit`.
export function dueOccurrences(
  start: string, frequency: Frequency, from: string, today: string, endDate?: string | null, limit: number = MAX_CATCH_UP,
): string[] {
  const out: string[] = [];
  let cur = firstOnOrAfter(start, frequency, from);
  while (out.length < limit && cur <= today && (!endDate || cur <= endDate)) {
    out.push(cur);
    cur = nextAfter(start, frequency, cur);
  }
  return out;
}

// Konversi nilai kolom @db.Date (Date pada UTC 00:00) <-> string.
export const dateToYmd = (d: Date): string => d.toISOString().slice(0, 10);
export const ymdToDate = (s: string): Date => new Date(`${s}T00:00:00Z`);
