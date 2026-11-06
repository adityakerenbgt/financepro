// Jalankan: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, dateToYmd, dueOccurrences, firstOnOrAfter, isValidYmd, nextAfter, occurrenceAt, todayWib, ymdToDate,
} from './recurring';

const seq = (start: string, f: any, n: number) => Array.from({ length: n }, (_, k) => occurrenceAt(start, f, k));

test('bulanan dari 31 Jan: Feb dipangkas lalu kembali ke tanggal 31 (dihitung dari tanggal mulai)', () => {
  assert.deepEqual(seq('2026-01-31', 'MONTHLY', 6), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30']);
});

test('bulanan 31 Jan pada tahun kabisat: 29 Feb', () => {
  assert.deepEqual(seq('2028-01-31', 'MONTHLY', 3), ['2028-01-31', '2028-02-29', '2028-03-31']);
});

test('bulanan tanggal 30 dan 29: bulan pendek dipangkas, bulan panjang kembali normal', () => {
  assert.deepEqual(seq('2026-01-30', 'MONTHLY', 3), ['2026-01-30', '2026-02-28', '2026-03-30']);
  assert.deepEqual(seq('2026-01-29', 'MONTHLY', 3), ['2026-01-29', '2026-02-28', '2026-03-29']);
});

test('bulanan melewati pergantian tahun', () => {
  assert.deepEqual(seq('2026-11-15', 'MONTHLY', 4), ['2026-11-15', '2026-12-15', '2027-01-15', '2027-02-15']);
  assert.equal(occurrenceAt('2026-12-31', 'MONTHLY', 2), '2027-02-28');
});

test('tahunan dari 29 Feb: 28 Feb di tahun biasa, 29 Feb di tahun kabisat', () => {
  assert.deepEqual(seq('2028-02-29', 'YEARLY', 5), ['2028-02-29', '2029-02-28', '2030-02-28', '2031-02-28', '2032-02-29']);
});

test('mingguan dan harian', () => {
  assert.deepEqual(seq('2026-02-23', 'WEEKLY', 3), ['2026-02-23', '2026-03-02', '2026-03-09']);
  assert.deepEqual(seq('2026-12-30', 'DAILY', 4), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
});

test('nextAfter memajukan satu kemunculan dan pulih ke tanggal asli setelah bulan pendek', () => {
  assert.equal(nextAfter('2026-01-31', 'MONTHLY', '2026-01-31'), '2026-02-28');
  assert.equal(nextAfter('2026-01-31', 'MONTHLY', '2026-02-28'), '2026-03-31'); // bukan 28 Mar
  assert.equal(nextAfter('2026-01-31', 'MONTHLY', '2026-03-31'), '2026-04-30');
  assert.equal(nextAfter('2026-01-05', 'WEEKLY', '2026-01-05'), '2026-01-12');
});

test('firstOnOrAfter: jadwal di masa depan, tepat di kemunculan, dan di antara kemunculan', () => {
  assert.equal(firstOnOrAfter('2026-12-01', 'MONTHLY', '2026-11-06'), '2026-12-01');
  assert.equal(firstOnOrAfter('2026-01-31', 'MONTHLY', '2026-02-28'), '2026-02-28');
  assert.equal(firstOnOrAfter('2026-01-31', 'MONTHLY', '2026-03-01'), '2026-03-31');
  assert.equal(firstOnOrAfter('2026-01-31', 'MONTHLY', '2026-03-31'), '2026-03-31');
  assert.equal(firstOnOrAfter('2026-01-05', 'WEEKLY', '2026-01-06'), '2026-01-12');
  assert.equal(firstOnOrAfter('2028-02-29', 'YEARLY', '2029-01-01'), '2029-02-28');
  assert.equal(firstOnOrAfter('2026-01-01', 'DAILY', '2026-01-10'), '2026-01-10');
});

test('mengejar jadwal terlewat 3 bulan: bulanan mulai 31 Agu, hari ini 6 Nov', () => {
  assert.deepEqual(dueOccurrences('2026-08-31', 'MONTHLY', '2026-08-31', '2026-11-06'), ['2026-08-31', '2026-09-30', '2026-10-31']);
});

test('mengejar 31 Jan sampai 1 Mar: 31 Jan dan 28 Feb (bukan 28 Mar)', () => {
  assert.deepEqual(dueOccurrences('2026-01-31', 'MONTHLY', '2026-01-31', '2026-03-01'), ['2026-01-31', '2026-02-28']);
});

test('batas pengejaran 31 kemunculan per kali jalan', () => {
  const r = dueOccurrences('2026-01-01', 'DAILY', '2026-01-01', '2026-03-31');
  assert.equal(r.length, 31);
  assert.equal(r[30], '2026-01-31');
  const lanjut = dueOccurrences('2026-01-01', 'DAILY', '2026-02-01', '2026-03-31');
  assert.equal(lanjut[0], '2026-02-01');
});

test('tanggal akhir (endDate) membatasi kemunculan', () => {
  assert.deepEqual(dueOccurrences('2026-08-15', 'MONTHLY', '2026-08-15', '2026-12-31', '2026-10-15'), ['2026-08-15', '2026-09-15', '2026-10-15']);
  assert.deepEqual(dueOccurrences('2026-08-15', 'MONTHLY', '2026-08-15', '2026-12-31', '2026-10-14'), ['2026-08-15', '2026-09-15']);
});

test('belum jatuh tempo: tidak ada kemunculan', () => {
  assert.deepEqual(dueOccurrences('2026-12-01', 'MONTHLY', '2026-12-01', '2026-11-06'), []);
});

test('todayWib: batas hari pada tengah malam WIB (17:00 UTC)', () => {
  assert.equal(todayWib(new Date('2026-11-30T16:59:59Z')), '2026-11-30');
  assert.equal(todayWib(new Date('2026-11-30T17:00:00Z')), '2026-12-01');
  assert.equal(todayWib(new Date('2026-12-31T17:00:00Z')), '2027-01-01');
  assert.equal(todayWib(new Date('2026-11-06T05:00:00Z')), '2026-11-06');
});

test('validasi tanggal: format dan tanggal yang tidak ada', () => {
  assert.ok(isValidYmd('2026-02-28'));
  assert.ok(isValidYmd('2028-02-29'));
  assert.ok(!isValidYmd('2026-02-29'));
  assert.ok(!isValidYmd('2026-13-01'));
  assert.ok(!isValidYmd('2026-1-5'));
  assert.ok(!isValidYmd('abc'));
});

test('konversi Date @db.Date <-> string dan addDays lintas bulan', () => {
  assert.equal(dateToYmd(ymdToDate('2026-11-30')), '2026-11-30');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});
