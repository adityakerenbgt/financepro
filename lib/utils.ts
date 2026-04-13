// ============================================================
// Utility functions: dates, currency, parsing, formatting
// ============================================================

import { format, parse, getISOWeek, getYear, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

// ---- Currency ----

export function formatCurrency(amount: number): string {
  return `Rp${Math.round(amount).toLocaleString('id-ID')}`;
}

export function parseCurrency(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[Rr]p/g, '').replace(/\./g, '').replace(/,/g, '').trim();
  return parseFloat(cleaned) || 0;
}

// ---- Date Parsing & Formatting ----

export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return parse(dateStr, 'dd/MM/yyyy', new Date());
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return parse(dateStr, 'yyyy-MM-dd', new Date());
  }
  return new Date(dateStr);
}

export function formatDateForDisplay(date: Date): string {
  return format(date, 'dd MMM yyyy', { locale: localeID });
}

export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getMonthString(date: Date): string {
  return format(date, 'MMM yyyy', { locale: localeID });
}

export function getWeekString(date: Date): string {
  const week = getISOWeek(date);
  const year = getYear(date);
  return `Minggu ${week} ${year}`;
}

export function getMonthRange(monthStr: string): { start: Date; end: Date } | null {
  // Try parsing "Feb 2026", "Februari 2026", "2026-02", etc.
  let date: Date | null = null;
  try { date = parse(monthStr, 'MMM yyyy', new Date(), { locale: localeID }); } catch {}
  if (!date || isNaN(date.getTime())) {
    try { date = parse(monthStr, 'MMMM yyyy', new Date(), { locale: localeID }); } catch {}
  }
  if (!date || isNaN(date.getTime())) {
    try { date = parse(monthStr, 'yyyy-MM', new Date()); } catch {}
  }
  if (!date || isNaN(date.getTime())) return null;
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export function getDayRange(dateStr: string): { start: Date; end: Date } {
  const date = parseDate(dateStr);
  return { start: startOfDay(date), end: endOfDay(date) };
}

// ---- ID Generation ----

export function generateTxId(date: Date, sequence: number): string {
  const d = format(date, 'yyyyMMdd');
  return `TRX-${d}-${String(sequence).padStart(3, '0')}`;
}

export function generateInvId(date: Date, sequence: number): string {
  const d = format(date, 'yyyyMMdd');
  return `INV-${d}-${String(sequence).padStart(3, '0')}`;
}

// ---- Status Helpers ----

export function getBudgetStatus(percentage: number): 'Aman' | 'Hampir Over' | 'Over Budget' {
  if (percentage > 100) return 'Over Budget';
  if (percentage >= 80) return 'Hampir Over';
  return 'Aman';
}

export function getGoalStatus(progress: number, targetDate: Date): 'On Track' | 'Tercapai' | 'Gagal' {
  if (progress >= 100) return 'Tercapai';
  if (targetDate < new Date() && progress < 100) return 'Gagal';
  return 'On Track';
}

// ---- Bot Input Parsing ----

export function parseTransactionInput(text: string) {
  const parts = text.split('|').map(p => p.trim());
  if (parts.length < 6) return null;
  const type = parts[4].toLowerCase();
  if (type !== 'pemasukan' && type !== 'pengeluaran') return null;
  return {
    date: parts[0],
    category: parts[1],
    description: parts[2],
    account: parts[3],
    type: (type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran') as 'Pemasukan' | 'Pengeluaran',
    amount: parseCurrency(parts[5]),
    note: parts[6] || undefined,
  };
}

export function parseSavingsInput(text: string) {
  const parts = text.split('|').map(p => p.trim());
  if (parts.length < 7) return null;
  const txType = parts[3] as 'Buy' | 'Sell' | 'Withdraw' | 'Goals';
  if (!['Buy', 'Sell', 'Withdraw', 'Goals'].includes(txType)) return null;
  return {
    date: parts[0],
    assetType: parts[1],
    instrumentName: parts[2],
    transactionType: txType,
    nominal: parseCurrency(parts[4]),
    pricePerUnit: parts[5] ? parseCurrency(parts[5]) : undefined,
    account: parts[6],
    notes: parts[7] || undefined,
  };
}

export function formatPercentage(v: number): string {
  return `${v.toFixed(2)}%`;
}
