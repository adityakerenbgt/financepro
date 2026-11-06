// Jalankan: npm run test:unit   (test runner bawaan Node, tanpa dependency tambahan)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeNetWorth, outstandingLiability } from './netWorth';

const JT = 1_000_000;

test('fixture handover: rekening 10jt + aset 5jt + piutang 1jt - hutang 3jt = 13jt', () => {
  const r = computeNetWorth(
    [{ balance: 10 * JT, isDebt: false }],
    [{ currentValue: 5 * JT }],
    [
      { debtType: 'Fixed', isPiutang: false, totalSpent: 3 * JT, totalPaid: 0, remainingDebt: 3 * JT },
      { debtType: 'Fixed', isPiutang: true, totalSpent: 1 * JT, totalPaid: 0, remainingDebt: 1 * JT },
    ],
  );
  assert.equal(r.netWorth, 13 * JT);
  assert.deepEqual(
    { cash: r.cash, assets: r.assets, receivables: r.receivables, liabilities: r.liabilities },
    { cash: 10 * JT, assets: 5 * JT, receivables: 1 * JT, liabilities: 3 * JT },
  );
});

test('kartu kredit tidak dihitung dua kali: saldo rekening kartu diabaikan, hutang yang dikurangkan', () => {
  // bank 10jt; belanja kartu 2jt (rekening kartu -2jt); limit 10jt
  const r = computeNetWorth(
    [{ balance: 10 * JT, isDebt: false }, { balance: -2 * JT, isDebt: true }],
    [],
    [{ debtType: 'Revolving', isPiutang: false, totalSpent: 2 * JT, totalPaid: 0, remainingDebt: 10 * JT /* = limit - dibayar */ }],
  );
  assert.equal(r.netWorth, 8 * JT, '10jt - 2jt (bukan 10jt - 2jt - 2jt, bukan 10jt - 10jt)');
  assert.equal(r.liabilities, 2 * JT);
  assert.equal(r.excludedCardBalance, -2 * JT);
});

test('membayar hutang tidak mengubah net worth (kas turun, hutang turun sama besar)', () => {
  const before = computeNetWorth(
    [{ balance: 10 * JT, isDebt: false }, { balance: -2 * JT, isDebt: true }],
    [],
    [{ debtType: 'Revolving', totalSpent: 2 * JT, totalPaid: 0, remainingDebt: 10 * JT }],
  );
  // bayar 500rb dari bank; rekening kartu tetap -2jt (pembayaran tidak menaikkannya)
  const after = computeNetWorth(
    [{ balance: 9.5 * JT, isDebt: false }, { balance: -2 * JT, isDebt: true }],
    [],
    [{ debtType: 'Revolving', totalSpent: 2 * JT, totalPaid: 0.5 * JT, remainingDebt: 9.5 * JT }],
  );
  assert.equal(after.netWorth, before.netWorth);
  assert.equal(after.liabilities, 1.5 * JT);
});

test('menerima pembayaran piutang tidak mengubah net worth (kas naik, piutang turun sama besar)', () => {
  const before = computeNetWorth([{ balance: 5 * JT, isDebt: false }], [], [{ debtType: 'Fixed', isPiutang: true, totalSpent: 1 * JT, totalPaid: 0, remainingDebt: 1 * JT }]);
  const after = computeNetWorth([{ balance: 5.4 * JT, isDebt: false }], [], [{ debtType: 'Fixed', isPiutang: true, totalSpent: 1 * JT, totalPaid: 0.4 * JT, remainingDebt: 0.6 * JT }]);
  assert.equal(Math.round(after.netWorth), Math.round(before.netWorth));
  assert.equal(Math.round(after.receivables), 0.6 * JT);
});

test('hutang tetap (cicilan): sisa = pokok - dibayar', () => {
  assert.equal(outstandingLiability({ debtType: 'Fixed', totalSpent: 12 * JT, totalPaid: 5 * JT, remainingDebt: 7 * JT }), 7 * JT);
});

test('kartu kredit sudah dilunasi atau kelebihan bayar: sisa tidak negatif', () => {
  assert.equal(outstandingLiability({ debtType: 'Revolving', totalSpent: 1 * JT, totalPaid: 1 * JT, remainingDebt: 9 * JT }), 0);
  assert.equal(outstandingLiability({ debtType: 'Revolving', totalSpent: 1 * JT, totalPaid: 3 * JT, remainingDebt: 7 * JT }), 0);
  assert.equal(outstandingLiability({ debtType: 'Fixed', totalSpent: 1 * JT, totalPaid: 0, remainingDebt: -5 }), 0);
});

test('hutang lunas dan piutang tertagih penuh tidak mempengaruhi hasil', () => {
  const r = computeNetWorth(
    [{ balance: 2 * JT, isDebt: false }],
    [],
    [
      { debtType: 'Fixed', isPiutang: false, totalSpent: 3 * JT, totalPaid: 3 * JT, remainingDebt: 0 },
      { debtType: 'Fixed', isPiutang: true, totalSpent: 1 * JT, totalPaid: 1 * JT, remainingDebt: 0 },
    ],
  );
  assert.equal(r.netWorth, 2 * JT);
});

test('net worth bisa negatif; rekening kas minus (overdraft) ikut mengurangi', () => {
  const r = computeNetWorth([{ balance: -1 * JT, isDebt: false }], [{ currentValue: 0.5 * JT }], [{ debtType: 'Fixed', totalSpent: 4 * JT, totalPaid: 0, remainingDebt: 4 * JT }]);
  assert.equal(r.netWorth, -4.5 * JT);
});

test('tanpa data sama sekali: semuanya 0', () => {
  assert.deepEqual(computeNetWorth([], [], []), { netWorth: 0, cash: 0, assets: 0, receivables: 0, liabilities: 0, excludedCardBalance: 0 });
});

test('beberapa rekening, aset, dan hutang dijumlahkan', () => {
  const r = computeNetWorth(
    [{ balance: 3 * JT, isDebt: false }, { balance: 2 * JT, isDebt: false }, { balance: 0.5 * JT, isDebt: false }],
    [{ currentValue: 4 * JT }, { currentValue: 1.5 * JT }],
    [
      { debtType: 'Fixed', totalSpent: 2 * JT, totalPaid: 0.5 * JT, remainingDebt: 1.5 * JT },
      { debtType: 'Revolving', totalSpent: 1 * JT, totalPaid: 0.25 * JT, remainingDebt: 9.75 * JT },
    ],
  );
  assert.equal(r.cash, 5.5 * JT);
  assert.equal(r.assets, 5.5 * JT);
  assert.equal(r.liabilities, 1.5 * JT + 0.75 * JT);
  assert.equal(r.netWorth, 5.5 * JT + 5.5 * JT - 2.25 * JT);
});
