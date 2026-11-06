// Pembaca file impor di sisi KLIEN (browser): CSV (PapaParse) dan XLSX (ExcelJS, dimuat hanya saat diperlukan agar
// bundle halaman lain tidak membengkak). Hasilnya matriks teks (baris pertama = judul kolom). Validasi isi baris
// dilakukan server; di sini hanya batas ukuran/jumlah dan konversi sel ke teks.

export const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_DATA_ROWS = 1000;
export const MAX_COLUMNS = 50;

export class ImportFileError extends Error {}

export interface ParsedFile {
  matrix: string[][]; // matrix[0] = judul kolom
  sheetName?: string;
}

// Sel Excel -> teks. Tanggal memakai komponen UTC (ExcelJS menyimpan tanggal Excel sebagai Date UTC).
export function cellToString(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('result' in o) return cellToString(o.result); // rumus
    if (Array.isArray(o.richText)) return (o.richText as { text?: string }[]).map(r => r.text ?? '').join('').trim();
    if ('text' in o) return String(o.text ?? '').trim(); // tautan
    if ('error' in o) return '';
  }
  return String(v);
}

function finalize(rows: string[][], sheetName?: string): ParsedFile {
  const cleaned = rows
    .map(r => r.map(c => (c ?? '').toString().trim()))
    .filter(r => r.some(c => c !== '')); // buang baris yang seluruhnya kosong
  if (cleaned.length === 0) throw new ImportFileError('File kosong.');
  const width = Math.max(...cleaned.map(r => r.length));
  if (width > MAX_COLUMNS) throw new ImportFileError(`File memiliki terlalu banyak kolom (maksimal ${MAX_COLUMNS}).`);
  const matrix = cleaned.map(r => Array.from({ length: width }, (_, i) => r[i] ?? ''));
  if (matrix.length < 2) throw new ImportFileError('File hanya berisi judul kolom; tidak ada baris data.');
  const dataRows = matrix.length - 1;
  if (dataRows > MAX_DATA_ROWS) throw new ImportFileError(`File berisi ${dataRows.toLocaleString('id-ID')} baris data; maksimal ${MAX_DATA_ROWS.toLocaleString('id-ID')} per impor. Bagi file menjadi beberapa bagian.`);
  return { matrix, sheetName };
}

export async function parseImportFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_BYTES) throw new ImportFileError('Ukuran file maksimal 2 MB.');
  if (file.size === 0) throw new ImportFileError('File kosong.');
  const name = file.name.toLowerCase();

  if (name.endsWith('.csv')) {
    const Papa = (await import('papaparse')).default;
    const text = (await file.text()).replace(/^﻿/, '');
    const res = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
    if (!res.data.length) throw new ImportFileError('File CSV kosong atau tidak bisa dibaca.');
    return finalize(res.data as string[][]);
  }

  if (name.endsWith('.xlsx')) {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(await file.arrayBuffer());
    } catch {
      throw new ImportFileError('File Excel tidak bisa dibaca. Pastikan formatnya .xlsx yang valid.');
    }
    const ws = wb.worksheets[0];
    if (!ws) throw new ImportFileError('File Excel tidak memiliki lembar kerja.');
    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: false }, row => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => { cells[col - 1] = cellToString(cell.value); });
      rows.push(Array.from(cells, c => c ?? ''));
    });
    return finalize(rows, ws.name);
  }

  if (name.endsWith('.xls')) throw new ImportFileError('Format .xls lama tidak didukung. Simpan ulang sebagai .xlsx atau .csv.');
  throw new ImportFileError('Jenis file tidak didukung. Gunakan .csv atau .xlsx.');
}

// ---------- pemetaan kolom ----------

export type FieldKey = 'date' | 'type' | 'amount' | 'category' | 'account' | 'description' | 'note';
export type Mapping = Record<FieldKey, number>; // -1 = tidak dipetakan

const SYNONYMS: Record<FieldKey, string[]> = {
  date: ['tanggal', 'tgl', 'date', 'tanggaltransaksi', 'waktu'],
  type: ['jenis', 'tipe', 'type', 'jenistransaksi'],
  amount: ['nominal', 'jumlah', 'amount', 'nilai', 'total'],
  category: ['kategori', 'category'],
  account: ['rekening', 'akun', 'account', 'bank', 'dompet'],
  description: ['deskripsi', 'keterangan', 'description', 'uraian', 'memo'],
  note: ['catatan', 'note', 'notes'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Menebak pemetaan dari judul kolom. Setiap kolom hanya dipakai satu kali.
export function guessMapping(headers: string[]): Mapping {
  const m: Mapping = { date: -1, type: -1, amount: -1, category: -1, account: -1, description: -1, note: -1 };
  const used = new Set<number>();
  (Object.keys(SYNONYMS) as FieldKey[]).forEach(field => {
    const idx = headers.findIndex((h, i) => !used.has(i) && SYNONYMS[field].includes(norm(h)));
    if (idx >= 0) { m[field] = idx; used.add(idx); }
  });
  return m;
}

// ---------- template & laporan ----------

const csvCell = (v: string) => (/[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const TEMPLATE_HEADER = ['Tanggal', 'Jenis', 'Nominal', 'Kategori', 'Rekening', 'Deskripsi', 'Catatan'];

// CSV dengan BOM agar Excel membukanya sebagai UTF-8.
export function toCsv(rows: string[][]): string {
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function buildTemplateCsv(): string {
  return toCsv([
    TEMPLATE_HEADER,
    ['05/11/2026', 'Pengeluaran', '25000', 'Makan', 'BCA', 'Kopi pagi', ''],
    ['05/11/2026', 'Pemasukan', '5000000', 'Gaji', 'BCA', 'Gaji November', 'Transfer perusahaan'],
    ['06/11/2026', 'Pengeluaran', '150000', 'Transportasi', 'Dompet', 'Isi bensin', ''],
  ]);
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
