import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from './db';

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 jam
export const MIN_PASSWORD_LENGTH = 8; // samakan dengan register

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Membuat token baru (32 byte acak) dan menyimpan HASH-nya. Token lama yang belum dipakai milik user dihapus
// agar hanya satu link yang berlaku. Mengembalikan token asli (hanya untuk dikirim lewat email).
export async function createResetToken(userId: string, now: Date = new Date()): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS) },
    }),
  ]);
  return token;
}

// Memakai token untuk mengganti password. Atomik dan sekali pakai: klaim token lewat updateMany bersyarat
// (usedAt null & belum kedaluwarsa), lalu ganti password dalam transaksi yang sama.
// Mengembalikan false untuk token tidak dikenal / kedaluwarsa / sudah dipakai (alasannya sengaja tidak dibedakan).
export async function consumeResetToken(token: string, newPassword: string, now: Date = new Date()): Promise<boolean> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record) return false;

  const passwordHash = await bcrypt.hash(newPassword, 10);
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: record.userId }, data: { password: passwordHash } });
    // Link reset lain milik user ini ikut tidak berlaku.
    await tx.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } });
    return true;
  });
}
