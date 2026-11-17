import { NextResponse } from 'next/server';
import { z } from 'zod';

// Skema validasi body request (T-DEBT-2). Pesan dalam Bahasa Indonesia; pesan pertama dikirim ke klien di field `error`,
// seluruh pesan per field di `fields`.

const trimmed = (label: string, max: number) =>
  z.string({ required_error: `${label} wajib diisi`, invalid_type_error: `${label} tidak valid` }).trim().min(1, `${label} wajib diisi`).max(max, `${label} maksimal ${max} karakter`);

// Angka dari number atau string numerik ("25000"); string kosong, null, NaN, dan Infinity ditolak.
const numeric = (label: string) =>
  z
    .union([z.number(), z.string().trim().min(1)], { errorMap: () => ({ message: `${label} harus berupa angka` }) })
    .transform((v) => Number(v))
    .pipe(z.number({ invalid_type_error: `${label} harus berupa angka` }).finite(`${label} harus berupa angka`));

export const positiveAmount = (label = 'Nominal') => numeric(label).pipe(z.number().positive(`${label} harus lebih dari 0`).max(1e15, `${label} terlalu besar`));
const money = (label: string) => numeric(label).pipe(z.number().min(-1e15, `${label} tidak valid`).max(1e15, `${label} tidak valid`));
const nonNegative = (label: string) => numeric(label).pipe(z.number().min(0, `${label} tidak boleh negatif`).max(1e15, `${label} terlalu besar`));

// Tanggal DD/MM/YYYY atau YYYY-MM-DD yang benar-benar ada di kalender.
export const dateString = (label = 'Tanggal') =>
  z
    .string({ required_error: `${label} wajib diisi`, invalid_type_error: `${label} tidak valid` })
    .trim()
    .refine((s) => {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s) ?? (() => { const x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return x ? [x[0], x[3], x[2], x[1]] : null; })();
      if (!m) return false;
      const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const dt = new Date(Date.UTC(y, mo - 1, d));
      return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
    }, `${label} tidak valid (gunakan DD/MM/YYYY)`);

const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} maksimal ${max} karakter`).nullish().transform((v) => (v ? v : undefined));

const entryType = z.enum(['Pemasukan', 'Pengeluaran'], { errorMap: () => ({ message: 'Jenis harus Pemasukan atau Pengeluaran' }) });

export const transactionCreateSchema = z.object({
  date: dateString(),
  category: trimmed('Kategori', 100),
  description: trimmed('Deskripsi', 200),
  account: trimmed('Rekening', 50),
  type: entryType,
  amount: positiveAmount(),
  note: optionalText('Catatan', 500),
});

export const transactionUpdateSchema = transactionCreateSchema.extend({ id: trimmed('ID', 100) });

export const transferCreateSchema = z.object({
  date: dateString(),
  fromAccount: trimmed('Rekening asal', 50),
  toAccount: trimmed('Rekening tujuan', 50),
  amount: positiveAmount(),
  notes: optionalText('Catatan', 500),
});

export const debtPaymentSchema = z.object({
  debtId: trimmed('Utang', 100),
  accountId: trimmed('Rekening', 100),
  amount: positiveAmount(),
  date: dateString(),
  notes: optionalText('Catatan', 500),
});

export const accountCreateSchema = z.object({
  name: trimmed('Nama rekening', 50),
  type: optionalText('Jenis rekening', 30),
  initialBalance: money('Saldo awal').nullish().transform((v) => v ?? 0),
});

export const debtCreateSchema = z.object({
  debtType: z.enum(['Revolving', 'Fixed'], { errorMap: () => ({ message: 'Jenis utang harus Revolving atau Fixed' }) }),
  debtName: trimmed('Nama utang', 100),
  limitOrPrincipal: positiveAmount('Limit/pokok'),
  interestRate: numeric('Bunga').pipe(z.number().min(0, 'Bunga tidak boleh negatif').max(1000, 'Bunga tidak valid')).nullish().or(z.literal('').transform(() => undefined)),
  tenor: numeric('Tenor').pipe(z.number().int('Tenor harus bilangan bulat').positive('Tenor harus lebih dari 0').max(1200, 'Tenor terlalu besar')).nullish().or(z.literal('').transform(() => undefined)),
  monthlyPayment: nonNegative('Cicilan bulanan').nullish().or(z.literal('').transform(() => undefined)),
  startDate: dateString('Tanggal mulai').nullish().or(z.literal('').transform(() => undefined)),
  isPiutang: z.boolean().nullish(),
});

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

// Memvalidasi body; bila gagal mengembalikan respons 400 siap kirim.
export function parseBody<S extends z.ZodTypeAny>(schema: S, body: unknown): ParseResult<z.output<S>> {
  const r = schema.safeParse(body ?? {});
  if (r.success) return { ok: true, data: r.data };
  const fields: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = r.error.issues[0]?.message ?? 'Input tidak valid';
  return { ok: false, response: NextResponse.json({ error: first, fields }, { status: 400 }) };
}
