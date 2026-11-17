import test from 'node:test';
import assert from 'node:assert/strict';
import { accountCreateSchema, dateString, debtCreateSchema, positiveAmount, transactionCreateSchema, transferCreateSchema } from './validators';

test('nominal: menerima angka & string numerik, menolak kosong/NaN/nol/negatif/Infinity', () => {
  const p = positiveAmount();
  assert.equal(p.parse(25000), 25000);
  assert.equal(p.parse('25000'), 25000);
  assert.equal(p.parse(' 1500.5 '), 1500.5);
  for (const bad of ['', '   ', null, undefined, 'abc', 0, '0', -5, '-5', Infinity, NaN, {}, [], true, 1e16]) {
    assert.equal(p.safeParse(bad).success, false, `harus ditolak: ${String(bad)}`);
  }
});

test('tanggal: DD/MM/YYYY dan YYYY-MM-DD yang ada di kalender', () => {
  const d = dateString();
  for (const ok of ['17/11/2026', '2026-11-17', '29/02/2028']) assert.equal(d.safeParse(ok).success, true, ok);
  for (const bad of ['31/02/2026', '29/02/2027', '2026-13-01', '17-11-2026', '', 'besok', '32/01/2026', null]) {
    assert.equal(d.safeParse(bad).success, false, `harus ditolak: ${String(bad)}`);
  }
});

test('transaksi: field wajib, jenis valid, catatan opsional, string di-trim', () => {
  const base = { date: '17/11/2026', category: ' Makan ', description: 'Nasi', account: 'Tunai', type: 'Pengeluaran', amount: '20000' };
  const r = transactionCreateSchema.parse(base);
  assert.equal(r.category, 'Makan');
  assert.equal(r.amount, 20000);
  assert.equal(r.note, undefined);
  assert.equal(transactionCreateSchema.safeParse({ ...base, type: 'Transfer' }).success, false);
  assert.equal(transactionCreateSchema.safeParse({ ...base, category: '' }).success, false);
  assert.equal(transactionCreateSchema.safeParse({ ...base, description: 'x'.repeat(201) }).success, false);
  assert.equal(transactionCreateSchema.safeParse({ ...base, note: 'x'.repeat(501) }).success, false);
  assert.equal(transactionCreateSchema.safeParse({ ...base, amount: 'abc' }).success, false);
  assert.equal(transactionCreateSchema.safeParse({ ...base, extra: 'diabaikan' }).success, true);
});

test('transfer & rekening', () => {
  assert.equal(transferCreateSchema.safeParse({ date: '17/11/2026', fromAccount: 'A', toAccount: 'B', amount: -1 }).success, false);
  assert.equal(transferCreateSchema.safeParse({ date: '17/11/2026', fromAccount: 'A', toAccount: 'B', amount: 100 }).success, true);
  assert.equal(accountCreateSchema.parse({ name: ' BCA ' }).initialBalance, 0);
  assert.equal(accountCreateSchema.parse({ name: 'BCA', initialBalance: '-5000' }).initialBalance, -5000);
  assert.equal(accountCreateSchema.safeParse({ name: '' }).success, false);
  assert.equal(accountCreateSchema.safeParse({ name: 'BCA', initialBalance: 'abc' }).success, false);
});

test('utang: opsional boleh kosong/null, tetapi bila diisi harus valid', () => {
  const ok = debtCreateSchema.parse({ debtType: 'Fixed', debtName: 'KPR', limitOrPrincipal: '500000', interestRate: '', tenor: null, monthlyPayment: '', startDate: '' });
  assert.equal(ok.limitOrPrincipal, 500000);
  assert.equal(ok.interestRate, undefined);
  assert.equal(ok.tenor, null);
  assert.equal(debtCreateSchema.safeParse({ debtType: 'Lain', debtName: 'x', limitOrPrincipal: 1 }).success, false);
  assert.equal(debtCreateSchema.safeParse({ debtType: 'Fixed', debtName: 'x', limitOrPrincipal: 1, tenor: 1.5 }).success, false);
  assert.equal(debtCreateSchema.safeParse({ debtType: 'Fixed', debtName: 'x', limitOrPrincipal: 1, interestRate: -1 }).success, false);
  assert.equal(debtCreateSchema.safeParse({ debtType: 'Fixed', debtName: 'x', limitOrPrincipal: 0 }).success, false);
});
