import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdminHours } from './adminHours';

test('jam kerja admin dihitung menurut WIB, bukan zona server', () => {
  assert.equal(isAdminHours(new Date('2026-11-17T00:59:59Z')), false); // 07:59 WIB
  assert.equal(isAdminHours(new Date('2026-11-17T01:00:00Z')), true);  // 08:00 WIB
  assert.equal(isAdminHours(new Date('2026-11-17T13:59:59Z')), true);  // 20:59 WIB
  assert.equal(isAdminHours(new Date('2026-11-17T14:00:00Z')), false); // 21:00 WIB
  assert.equal(isAdminHours(new Date('2026-11-17T17:00:00Z')), false); // 00:00 WIB hari berikutnya
});
