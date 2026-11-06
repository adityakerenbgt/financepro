import { createHmac, timingSafeEqual } from 'crypto';
import { JWT_SECRET } from './env';

// Token berhenti berlangganan: HMAC-SHA256 yang terikat pada tujuan ("digest-unsubscribe") dan userId.
// Tidak punya masa berlaku (tautan di email lama tetap harus berfungsi) dan hanya bisa dipakai untuk satu hal:
// mematikan digest akun itu. Tidak bisa dipakai sebagai kredensial login atau untuk akun lain.
const PURPOSE = 'digest-unsubscribe';

export function signUnsubscribeToken(userId: string): string {
  return createHmac('sha256', JWT_SECRET).update(`${PURPOSE}:${userId}`).digest('hex');
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  if (typeof userId !== 'string' || typeof token !== 'string' || !userId || !/^[a-f0-9]{64}$/.test(token)) return false;
  const expected = Buffer.from(signUnsubscribeToken(userId), 'hex');
  const given = Buffer.from(token, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
