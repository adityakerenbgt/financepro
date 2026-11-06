// Jalankan: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duplicateKey, normalizeType, parseImportDate, parseRupiah, validateRow } from './importParsing';

const TODAY = '2026-11-06';
const val = (r: ReturnType<typeof parseRupiah>) => (r.ok ? r.value : `ERR:${r.error}`);

test('Rupiah bulat: berbagai format yang sah', () => {
  assert.equal(val(parseRupiah('1500000')), 1500000);
  assert.equal(val(parseRupiah('1.500.000')), 1500000);
  assert.equal(val(parseRupiah('1,500,000')), 1500000);
  assert.equal(val(parseRupiah('Rp1.500.000')), 1500000);
  assert.equal(val(parseRupiah('Rp 1.500.000')), 1500000);
  assert.equal(val(parseRupiah('rp. 25.000')), 25000);
  assert.equal(val(parseRupiah('IDR 25000')), 25000);
  assert.equal(val(parseRupiah(' 25.000 ')), 25000);
  assert.equal(val(parseRupiah('1.500')), 1500);   // di konteks Rupiah, titik 3 digit = pemisah ribuan
  assert.equal(val(parseRupiah('999')), 999);
  assert.equal(val(parseRupiah(1500000)), 1500000);
});

test('desimal nol di belakang diterima sebagai bilangan bulat', () => {
  assert.equal(val(parseRupiah('1.500.000,00')), 1500000);
  assert.equal(val(parseRupiah('1,500,000.00')), 1500000);
  assert.equal(val(parseRupiah('1500000.00')), 1500000);
  assert.equal(val(parseRupiah('1500000,0')), 1500000);
});

test('desimal bernilai DITOLAK (bukan dibaca salah seperti parseCurrency lama: "1.000,50" -> 100050)', () => {
  const DEC = 'ERR:Nominal harus bilangan bulat Rupiah (tanpa desimal)';
  assert.equal(val(parseRupiah('1.000,50')), DEC);
  assert.equal(val(parseRupiah('1000.50')), DEC);
  assert.equal(val(parseRupiah('1,5')), DEC);
  assert.equal(val(parseRupiah('1.5')), DEC);
  assert.equal(val(parseRupiah('0,5')), DEC);
  assert.equal(val(parseRupiah(1500.5)), DEC);
  assert.equal(val(parseRupiah('1.500.000,75')), DEC);
});

test('nominal bertanda negatif: tanda minus dan kurung', () => {
  assert.equal(val(parseRupiah('-50000')), -50000);
  assert.equal(val(parseRupiah('-Rp50.000')), -50000);
  assert.equal(val(parseRupiah('Rp-50.000')), -50000);
  assert.equal(val(parseRupiah('(Rp50.000)')), -50000);
  assert.equal(val(parseRupiah('-Rp-50.000')), 50000); // dua minus saling meniadakan; tidak realistis tetapi deterministik
  assert.equal(val(parseRupiah('(50.000)')), -50000);
  assert.equal(val(parseRupiah('−50.000')), -50000);
});

test('nominal tidak valid ditolak dengan pesan yang tepat', () => {
  assert.equal(val(parseRupiah('')), 'ERR:Nominal kosong');
  assert.equal(val(parseRupiah('   ')), 'ERR:Nominal kosong');
  assert.equal(val(parseRupiah(null)), 'ERR:Nominal kosong');
  assert.equal(val(parseRupiah('abc')), 'ERR:Format nominal tidak valid');
  assert.equal(val(parseRupiah('12abc')), 'ERR:Format nominal tidak valid');
  assert.equal(val(parseRupiah('1.2.3')), 'ERR:Nominal harus bilangan bulat Rupiah (tanpa desimal)');
  assert.equal(val(parseRupiah('Rp')), 'ERR:Format nominal tidak valid');
  assert.equal(val(parseRupiah(NaN)), 'ERR:Format nominal tidak valid');
  assert.equal(val(parseRupiah('99999999999999999999')), 'ERR:Nominal terlalu besar');
});

test('tanggal: format yang diterima', () => {
  const ok = (s: string) => { const r = parseImportDate(s, TODAY); return r.ok ? r.value : `ERR:${r.error}`; };
  assert.equal(ok('2026-11-05'), '2026-11-05');
  assert.equal(ok('2026-1-5'), '2026-01-05');
  assert.equal(ok('05/11/2026'), '2026-11-05');
  assert.equal(ok('5/11/2026'), '2026-11-05');
  assert.equal(ok('5-1-2026'), '2026-01-05');
  assert.equal(ok('05.11.2026'), '2026-11-05');
  assert.equal(ok('2026-11-05T00:00:00.000Z'), '2026-11-05');
  assert.equal(ok('2026-11-05 14:30:00'), '2026-11-05');
  assert.equal(ok('29/02/2024'), '2024-02-29'); // hari kabisat yang sah dan sudah lewat
});

test('tanggal: hari lebih dulu (DD/MM), bukan MM/DD', () => {
  const r = parseImportDate('03/04/2026', TODAY);
  assert.ok(r.ok && r.value === '2026-04-03');
});

test('tanggal: ditolak dengan alasan', () => {
  const err = (s: unknown) => { const r = parseImportDate(s, TODAY); return r.ok ? 'OK' : r.error; };
  assert.equal(err('31/02/2026'), 'Tanggal tidak valid');
  assert.equal(err('29/02/2026'), 'Tanggal tidak valid');
  assert.equal(err('2026-13-01'), 'Tanggal tidak valid');
  assert.equal(err('05/11/26'), 'Format tanggal tidak dikenali (gunakan DD/MM/YYYY atau YYYY-MM-DD)');
  assert.equal(err('kemarin'), 'Format tanggal tidak dikenali (gunakan DD/MM/YYYY atau YYYY-MM-DD)');
  assert.equal(err(''), 'Tanggal kosong');
  assert.equal(err(undefined), 'Tanggal kosong');
  assert.equal(err('1999-12-31'), 'Tanggal di luar rentang yang diizinkan');
  assert.equal(err('2028-01-01'), 'Tanggal di luar rentang yang diizinkan'); // > hari ini + 366 hari
  assert.equal(err('2027-11-06'), 'OK');
});

test('jenis: sinonim dan huruf besar/kecil', () => {
  assert.equal(normalizeType('Pemasukan'), 'Pemasukan');
  assert.equal(normalizeType(' MASUK '), 'Pemasukan');
  assert.equal(normalizeType('income'), 'Pemasukan');
  assert.equal(normalizeType('Pengeluaran'), 'Pengeluaran');
  assert.equal(normalizeType('keluar'), 'Pengeluaran');
  assert.equal(normalizeType('Expense'), 'Pengeluaran');
  assert.equal(normalizeType('-'), 'Pengeluaran');
  assert.equal(normalizeType('transfer'), null);
  assert.equal(normalizeType(''), null);
  assert.equal(normalizeType(5), null);
});

const ctx = (o: object = {}) => ({ typeMode: 'column' as const, defaultAccount: 'Bank', todayYmd: TODAY, ...o });
const row = (o: object = {}) => ({ ref: 2, date: '05/11/2026', type: 'Pengeluaran', amount: 'Rp25.000', category: 'Makan', account: 'BCA', description: 'Kopi', note: '', ...o });

test('baris valid dinormalisasi', () => {
  const r = validateRow(row(), ctx());
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value, { ref: 2, date: '2026-11-05', type: 'Pengeluaran', amount: 25000, category: 'Makan', account: 'BCA', description: 'Kopi', note: null });
});

test('nilai kosong: kategori -> Lainnya, deskripsi -> nama kategori, rekening -> rekening bawaan', () => {
  const r = validateRow(row({ category: '', description: '', account: '' }), ctx());
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual([r.value.category, r.value.description, r.value.account], ['Lainnya', 'Lainnya', 'Bank']);
  const noDefault = validateRow(row({ account: '' }), ctx({ defaultAccount: '' }));
  assert.ok(!noDefault.ok && noDefault.error === 'Rekening kosong');
});

test('mode jenis: sign, allExpense, allIncome, column', () => {
  const neg = validateRow(row({ type: '', amount: '-50.000' }), ctx({ typeMode: 'sign' }));
  assert.ok(neg.ok && neg.value.type === 'Pengeluaran' && neg.value.amount === 50000);
  const pos = validateRow(row({ type: '', amount: '50.000' }), ctx({ typeMode: 'sign' }));
  assert.ok(pos.ok && pos.value.type === 'Pemasukan');
  assert.ok(validateRow(row({ type: 'x' }), ctx({ typeMode: 'allExpense' })).ok);
  const inc = validateRow(row({ type: 'x' }), ctx({ typeMode: 'allIncome' }));
  assert.ok(inc.ok && inc.value.type === 'Pemasukan');
  const bad = validateRow(row({ type: 'transfer' }), ctx());
  assert.ok(!bad.ok && bad.error.startsWith('Jenis tidak dikenali'));
  const empty = validateRow(row({ type: '' }), ctx());
  assert.ok(!empty.ok && empty.error === 'Jenis kosong');
});

test('nominal negatif + jenis Pemasukan bertentangan; negatif + Pengeluaran diterima (nilai mutlak)', () => {
  const c = validateRow(row({ type: 'Pemasukan', amount: '-1.000' }), ctx());
  assert.ok(!c.ok && c.error.includes('bertentangan'));
  const e = validateRow(row({ type: 'Pengeluaran', amount: '-1.000' }), ctx());
  assert.ok(e.ok && e.value.amount === 1000);
});

test('batas panjang dan nominal nol', () => {
  assert.ok(!validateRow(row({ amount: '0' }), ctx()).ok);
  assert.ok(!validateRow(row({ description: 'x'.repeat(201) }), ctx()).ok);
  assert.ok(!validateRow(row({ category: 'k'.repeat(51) }), ctx()).ok);
  assert.ok(!validateRow(row({ account: 'a'.repeat(51) }), ctx()).ok);
  assert.ok(!validateRow(row({ note: 'n'.repeat(301) }), ctx()).ok);
  assert.ok(validateRow(row({ description: 'x'.repeat(200) }), ctx()).ok);
});

test('rekening dan deskripsi dirapikan (spasi ganda dibuang)', () => {
  const r = validateRow(row({ account: '  Bank   BCA ', description: ' Makan   siang ' }), ctx());
  assert.ok(r.ok && r.value.account === 'Bank BCA' && r.value.description === 'Makan siang');
});

test('kunci duplikat tidak peka huruf besar/kecil dan spasi tepi', () => {
  assert.equal(duplicateKey('2026-11-05', 'Pengeluaran', 25000, ' Kopi '), duplicateKey('2026-11-05', 'Pengeluaran', 25000, 'kopi'));
  assert.notEqual(duplicateKey('2026-11-05', 'Pengeluaran', 25000, 'kopi'), duplicateKey('2026-11-05', 'Pemasukan', 25000, 'kopi'));
  assert.notEqual(duplicateKey('2026-11-05', 'Pengeluaran', 25000, 'kopi'), duplicateKey('2026-11-06', 'Pengeluaran', 25000, 'kopi'));
});
