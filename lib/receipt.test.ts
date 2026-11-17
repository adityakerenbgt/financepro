import test from 'node:test';
import assert from 'node:assert/strict';
import { ReceiptReadError, normalizeReceipt, sniffImageMime, toRupiah } from './receipt';

const cats = ['Makan & Minum', 'Transportasi', 'Lainnya'];
const ctx = { categories: cats, today: '2026-11-17' };

test('sniffImageMime membaca isi file, bukan nama/header', () => {
  assert.equal(sniffImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])), 'image/jpeg');
  assert.equal(sniffImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(sniffImageMime(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), 'image/webp');
  assert.equal(sniffImageMime(new TextEncoder().encode('<svg onload=alert(1)>')), null);
  assert.equal(sniffImageMime(new TextEncoder().encode('%PDF-1.7')), null);
  assert.equal(sniffImageMime(new Uint8Array()), null);
});

test('toRupiah: angka & teks berformat Indonesia/Inggris, dibulatkan, menolak tak valid', () => {
  assert.deepEqual(toRupiah(25000), { value: 25000, rounded: false });
  assert.deepEqual(toRupiah('Rp 25.000'), { value: 25000, rounded: false });
  assert.deepEqual(toRupiah('1.250.000'), { value: 1250000, rounded: false });
  assert.deepEqual(toRupiah('25,000'), { value: 25000, rounded: false });
  assert.deepEqual(toRupiah('25000.00'), { value: 25000, rounded: false });
  assert.deepEqual(toRupiah(25000.6), { value: 25001, rounded: true });
  for (const bad of [0, -5, '', 'abc', null, undefined, NaN, Infinity, 1e15, {}, '-']) assert.equal(toRupiah(bad), null, String(bad));
});

test('normalizeReceipt: hasil baik', () => {
  const r = normalizeReceipt({ merchant: ' Indomaret  Cipete ', date: '2026-11-16', total: 54300, category: 'makan & minum', items: [{ name: 'Teh', amount: 5000 }, { name: '', amount: 1 }, { name: 'X', amount: 'abc' }] }, ctx);
  assert.deepEqual(r.draft, { date: '2026-11-16', amount: 54300, merchant: 'Indomaret Cipete', category: 'Makan & Minum', items: [{ name: 'Teh', amount: 5000 }] });
  assert.deepEqual(r.warnings, []);
});

test('normalizeReceipt: total tidak terbaca/0/bukan nota -> error', () => {
  for (const raw of [{}, { total: 0 }, { total: 'abc' }, null, 'teks', { total: -1000 }]) {
    assert.throws(() => normalizeReceipt(raw, ctx), ReceiptReadError);
  }
});

test('normalizeReceipt: tanggal tak valid/masa depan/terlalu lama -> hari ini + peringatan', () => {
  for (const date of ['2026-02-31', '2099-01-01', '2020-01-01', 'kemarin', '17/11/2026']) {
    const r = normalizeReceipt({ total: 1000, date }, ctx);
    assert.equal(r.draft.date, '2026-11-17', date);
    assert.ok(r.warnings.includes('date_invalid'), date);
  }
  assert.ok(normalizeReceipt({ total: 1000 }, ctx).warnings.includes('date_missing'));
  assert.equal(normalizeReceipt({ total: 1000, date: '2026-11-18' }, ctx).draft.date, '2026-11-18', 'toleransi 1 hari (zona waktu)');
});

test('normalizeReceipt: kategori di luar daftar user ditolak (tidak membuat kategori baru dari output model)', () => {
  const r = normalizeReceipt({ total: 1000, category: 'Judi Online"; DROP TABLE' }, ctx);
  assert.equal(r.draft.category, 'Lainnya');
  assert.ok(r.warnings.includes('category_unknown'));
  assert.equal(normalizeReceipt({ total: 1000, category: 'x' }, { categories: ['Makan'], today: ctx.today }).draft.category, '');
});

test('normalizeReceipt: teks dibersihkan (kontrol, panjang), item dibatasi, total dibulatkan', () => {
  const r = normalizeReceipt({ merchant: 'Toko\n\t\u0000Jaya' + 'x'.repeat(300), total: 1000.4, items: Array.from({ length: 80 }, (_, i) => ({ name: `i${i}`, amount: 1 })) }, ctx);
  assert.ok(!/[\u0000-\u001f]/.test(r.draft.merchant));
  assert.ok(r.draft.merchant.length <= 100);
  assert.equal(r.draft.items.length, 30);
  assert.equal(r.draft.amount, 1000);
  assert.ok(r.warnings.includes('amount_rounded'));
});

import { COMPAT_PRESETS, extractJsonObject, getReceiptProvider, providerLabel } from './receipt';

test('extractJsonObject: JSON polos, berpagar ```, dengan kalimat pengantar; menolak yang bukan JSON', () => {
  assert.deepEqual(extractJsonObject('{"total": 1000}'), { total: 1000 });
  assert.deepEqual(extractJsonObject('```json\n{"total": 1000}\n```'), { total: 1000 });
  assert.deepEqual(extractJsonObject('Tentu, ini hasilnya:\n{"total": 1000, "items": []}\nSemoga membantu.'), { total: 1000, items: [] });
  assert.throws(() => extractJsonObject('maaf saya tidak bisa membaca gambar'), ReceiptReadError);
  assert.throws(() => extractJsonObject('{rusak'), ReceiptReadError);
});

test('getReceiptProvider: hanya nilai dikenal; selain itu on-device', () => {
  const old = process.env.RECEIPT_PROVIDER;
  try {
    for (const p of ['gemini', 'groq', 'openrouter', 'mistral', 'openai']) { process.env.RECEIPT_PROVIDER = p; assert.equal(getReceiptProvider(), p); }
    for (const bad of ['', 'GROQ', 'evil', 'ondevice']) { process.env.RECEIPT_PROVIDER = bad; assert.equal(getReceiptProvider(), 'ondevice', bad); }
    delete process.env.RECEIPT_PROVIDER; assert.equal(getReceiptProvider(), 'ondevice');
  } finally { if (old === undefined) delete process.env.RECEIPT_PROVIDER; else process.env.RECEIPT_PROVIDER = old; }
  assert.equal(providerLabel('groq'), 'Groq');
  assert.ok(COMPAT_PRESETS.groq.base.startsWith('https://'));
});
