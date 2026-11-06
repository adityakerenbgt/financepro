// Helper rentang tanggal. Murni (tanpa impor server) sehingga aman dipakai di server maupun klien.
// Format tanggal selalu 'YYYY-MM-DD'; server lalu menafsirkannya dengan parseDate() yang sama dengan saat transaksi disimpan.

const WIB_OFFSET = 7 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type PresetKey = 'thisMonth' | 'lastMonth' | 'last7' | 'last30' | 'last3m' | 'thisYear' | 'all';

export interface DateRange {
  startDate: string; // '' = tanpa batas
  endDate: string;
}

// Tanggal 'YYYY-MM-DD' dari komponen tanggal LOKAL (dipakai di browser).
export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Rentang preset menurut tanggal `today` (waktu lokal pemanggil).
export function presetRange(key: PresetKey, today: Date = new Date()): DateRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = (yy: number, mm: number, dd: number) => toDateString(new Date(yy, mm, dd));
  switch (key) {
    case 'thisMonth': return { startDate: day(y, m, 1), endDate: day(y, m + 1, 0) };
    case 'lastMonth': return { startDate: day(y, m - 1, 1), endDate: day(y, m, 0) };
    case 'last7': return { startDate: day(y, m, today.getDate() - 6), endDate: toDateString(today) };
    case 'last30': return { startDate: day(y, m, today.getDate() - 29), endDate: toDateString(today) };
    case 'last3m': return { startDate: day(y, m - 2, 1), endDate: toDateString(today) };
    case 'thisYear': return { startDate: day(y, 0, 1), endDate: day(y, 11, 31) };
    case 'all': return { startDate: '', endDate: '' };
  }
}

// Bulan berjalan menurut WIB (UTC+7), terlepas dari zona waktu server (Vercel = UTC).
// Contoh: 1 Des 00:30 WIB = 30 Nov 17:30 UTC, dan tetap dihitung sebagai Desember.
export function wibMonthRange(now: Date = new Date()): DateRange {
  const w = new Date(now.getTime() + WIB_OFFSET);
  const y = w.getUTCFullYear();
  const m = w.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { startDate: `${y}-${pad(m + 1)}-01`, endDate: `${y}-${pad(m + 1)}-${pad(last)}` };
}

export interface ResolvedRange {
  startDate?: string;
  endDate?: string;
  restricted: boolean; // plan FREE: rentang dipaksa ke bulan berjalan
  adjusted: boolean; // permintaan klien berbeda dari rentang yang diberlakukan
}

// Menentukan rentang yang berlaku untuk dashboard. PRO: sesuai permintaan. FREE: selalu bulan berjalan (WIB),
// parameter klien diabaikan.
export function resolveDashboardRange(
  plan: 'FREE' | 'PRO',
  requested: { startDate?: string; endDate?: string },
  now: Date = new Date(),
): ResolvedRange {
  if (plan === 'PRO') {
    return { startDate: requested.startDate, endDate: requested.endDate, restricted: false, adjusted: false };
  }
  const allowed = wibMonthRange(now);
  const asked = !!(requested.startDate || requested.endDate);
  const same = requested.startDate === allowed.startDate && requested.endDate === allowed.endDate;
  return { ...allowed, restricted: true, adjusted: asked && !same };
}
