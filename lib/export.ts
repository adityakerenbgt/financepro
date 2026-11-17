// Ekspor transaksi & laporan bulanan ke CSV / XLSX / PDF. Semua pembangun menerima data yang SUDAH difilter per user
// oleh pemanggil (route). Library berat dimuat lazy supaya tidak membebani route lain.
import prisma from './db';
import { endOfDay } from 'date-fns';
import { formatDateISO, parseDate } from './utils';

export const EXPORT_ROW_CAP = 20_000;
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExportRow {
  txId: string; date: string; category: string; description: string; account: string; type: string; amount: number; note: string;
}
export interface ExportDoc {
  title: string;
  subtitle: string; // mis. periode & filter
  summary: [string, string][]; // pasangan label/nilai (sudah terformat)
  rows: ExportRow[];
  totals: { income: number; expense: number };
  truncated: boolean;
}

export const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;
// 2026-11-17 -> 17/11/2026
export const idDate = (iso: string) => iso.split('-').reverse().join('/');

export async function fetchExportRows(userId: string, f: {
  startDate?: string; endDate?: string; type?: string; category?: string; search?: string; month?: string;
}): Promise<{ rows: ExportRow[]; truncated: boolean }> {
  const where: any = { userId };
  if (f.month) where.month = f.month;
  if (f.startDate || f.endDate) {
    where.date = {};
    if (f.startDate) where.date.gte = parseDate(f.startDate);
    if (f.endDate) where.date.lte = endOfDay(parseDate(f.endDate));
  }
  if (f.type) where.type = f.type;
  if (f.category) where.category = { name: f.category };
  if (f.search) where.description = { contains: f.search, mode: 'insensitive' };

  const txs = await prisma.transaction.findMany({
    where, include: { category: { select: { name: true } }, account: { select: { name: true } } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }], take: EXPORT_ROW_CAP + 1,
  });
  const truncated = txs.length > EXPORT_ROW_CAP;
  return {
    truncated,
    rows: txs.slice(0, EXPORT_ROW_CAP).map(t => ({
      txId: t.txId, date: formatDateISO(t.date), category: t.category.name, description: t.description,
      account: t.account.name, type: t.type, amount: t.amount, note: t.note ?? '',
    })),
  };
}

export function totalsOf(rows: ExportRow[]) {
  let income = 0, expense = 0;
  for (const r of rows) { if (r.type === 'Pemasukan') income += r.amount; else expense += r.amount; }
  return { income, expense };
}

// Cegah formula injection di Excel/Sheets: sel teks yang diawali = + - @ (atau tab/CR) diberi apostrof.
export const safeCell = (s: string) => (/^[=+\-@\t\r]/.test(s) ? "'" + s : s);

const HEADERS = ['ID', 'Tanggal', 'Kategori', 'Deskripsi', 'Rekening', 'Jenis', 'Nominal (Rp)', 'Catatan'];

export async function buildCsv(doc: ExportDoc): Promise<Buffer> {
  const Papa = (await import('papaparse')).default;
  const data = doc.rows.map(r => [r.txId, idDate(r.date), r.category, r.description, r.account, r.type, Math.round(r.amount), r.note].map(v => typeof v === 'string' ? safeCell(v) : v));
  const csv = Papa.unparse({ fields: HEADERS, data }, { newline: '\r\n' });
  return Buffer.concat([Buffer.from('﻿', 'utf8'), Buffer.from(csv, 'utf8')]); // BOM agar Excel membaca UTF-8
}

export async function buildXlsx(doc: ExportDoc): Promise<Buffer> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FinancePro';
  const ws = wb.addWorksheet('Transaksi');
  ws.addRow([doc.title]).font = { bold: true, size: 14 };
  ws.addRow([doc.subtitle]);
  for (const [k, v] of doc.summary) ws.addRow([k, v]);
  ws.addRow([]);
  const head = ws.addRow(HEADERS);
  head.font = { bold: true };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  for (const r of doc.rows) {
    ws.addRow([r.txId, idDate(r.date), safeCell(r.category), safeCell(r.description), safeCell(r.account), r.type, Math.round(r.amount), safeCell(r.note)]);
  }
  ws.getColumn(7).numFmt = '#,##0';
  [14, 12, 20, 36, 16, 13, 16, 30].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  // autoFilter sengaja tidak dipakai: ExcelJS memprosesnya sangat lambat untuk ribuan baris (4+ detik per 5.000 baris).
  ws.views = [{ state: 'frozen', ySplit: head.number }];
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

// pdf-lib memakai font standar (WinAnsi): karakter di luar Latin-1 diganti agar tidak melempar error.
const winAnsi = (s: string) => s.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7E -ÿ]/g, '?');

export async function buildPdf(doc: ExportDoc): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 842, H = 595, M = 36; // A4 landscape
  const cols = [
    { h: 'Tanggal', w: 62, x: 0 }, { h: 'Kategori', w: 100, x: 0 }, { h: 'Deskripsi', w: 250, x: 0 },
    { h: 'Rekening', w: 90, x: 0 }, { h: 'Jenis', w: 70, x: 0 }, { h: 'Nominal', w: 94, x: 0 }, { h: 'Catatan', w: 106, x: 0 },
  ];
  let cx = M; cols.forEach(c => { c.x = cx; cx += c.w; });
  const fit = (s: string, f: typeof font, size: number, maxW: number) => {
    let t = winAnsi(s);
    if (f.widthOfTextAtSize(t, size) <= maxW) return t;
    while (t.length > 1 && f.widthOfTextAtSize(t + '...', size) > maxW) t = t.slice(0, -1);
    return t + '...';
  };

  let page = pdf.addPage([W, H]);
  let y = H - M;
  const drawHeader = () => {
    cols.forEach(c => page.drawText(c.h, { x: c.x, y, size: 8, font: bold, color: rgb(0.2, 0.25, 0.33) }));
    page.drawLine({ start: { x: M, y: y - 3 }, end: { x: W - M, y: y - 3 }, thickness: 0.5, color: rgb(0.6, 0.65, 0.7) });
    y -= 14;
  };

  page.drawText(winAnsi(doc.title), { x: M, y, size: 15, font: bold }); y -= 16;
  page.drawText(fit(doc.subtitle, font, 9, W - 2 * M), { x: M, y, size: 9, font, color: rgb(0.3, 0.35, 0.4) }); y -= 14;
  for (const [k, v] of doc.summary) {
    page.drawText(winAnsi(k), { x: M, y, size: 9, font }); page.drawText(winAnsi(v), { x: M + 130, y, size: 9, font: bold }); y -= 12;
  }
  y -= 8;
  drawHeader();

  for (const r of doc.rows) {
    if (y < M + 20) { page = pdf.addPage([W, H]); y = H - M; drawHeader(); }
    const cells = [idDate(r.date), r.category, r.description, r.account, r.type, rupiah(r.amount), r.note];
    cells.forEach((v, i) => {
      const c = cols[i];
      if (i === 5) { // nominal rata kanan
        const t = winAnsi(v); page.drawText(t, { x: c.x + c.w - 8 - font.widthOfTextAtSize(t, 8), y, size: 8, font });
      } else page.drawText(fit(v, font, 8, c.w - 6), { x: c.x, y, size: 8, font });
    });
    y -= 11;
  }
  if (doc.rows.length === 0) page.drawText('Tidak ada transaksi pada periode ini.', { x: M, y, size: 9, font });
  if (doc.truncated) { y -= 14; page.drawText(`Dibatasi ${EXPORT_ROW_CAP.toLocaleString('id-ID')} baris pertama; persempit rentang tanggal.`, { x: M, y, size: 8, font }); }

  const pages = pdf.getPages();
  pages.forEach((p, i) => p.drawText(`FinancePro - halaman ${i + 1}/${pages.length}`, { x: W - M - 110, y: 18, size: 7, font, color: rgb(0.5, 0.55, 0.6) }));
  return Buffer.from(await pdf.save());
}

export const MIME: Record<ExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

export async function build(format: ExportFormat, doc: ExportDoc): Promise<Buffer> {
  return format === 'csv' ? buildCsv(doc) : format === 'xlsx' ? buildXlsx(doc) : buildPdf(doc);
}
