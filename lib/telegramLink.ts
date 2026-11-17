import { randomInt } from 'crypto';
import prisma from './db';

// Penautan chat Telegram <-> akun FinancePro. Alur: user membuat kode di Pengaturan (web, sudah login), lalu mengirim
// "/link KODE" ke bot. Kode 6 digit, berlaku 10 menit, SEKALI PAKAI (dihapus saat dipakai). Satu chat hanya boleh
// tertaut ke satu akun.

export const LINK_CODE_TTL_MS = 10 * 60 * 1000;
export const PENDING_TTL_MS = 10 * 60 * 1000;

export async function createLinkCode(userId: string, now: Date = new Date()): Promise<{ code: string; expiresAt: Date }> {
  // Rapikan kode lama: milik user ini (hanya satu kode aktif) dan yang sudah kedaluwarsa.
  await prisma.telegramLinkCode.deleteMany({ where: { OR: [{ userId }, { expiresAt: { lt: now } }] } });
  const expiresAt = new Date(now.getTime() + LINK_CODE_TTL_MS);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(randomInt(100000, 1000000));
    try {
      await prisma.telegramLinkCode.create({ data: { userId, code, expiresAt } });
      return { code, expiresAt };
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e; // bentrok dengan kode aktif lain: coba angka lain
    }
  }
  throw new Error('Gagal membuat kode tautan');
}

export type LinkResult =
  | { ok: true; userId: string; username: string }
  | { ok: false; reason: 'invalid_or_expired' | 'chat_taken' };

class ChatTaken extends Error {}

// Memakai kode untuk menautkan chat. Atomik: kode dihapus (diklaim) dan chat ditautkan dalam satu transaksi; bila chat
// sudah dipakai akun lain, transaksi dibatalkan sehingga kode TIDAK hangus.
export async function consumeLinkCode(code: string, chatId: string, now: Date = new Date()): Promise<LinkResult> {
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: 'invalid_or_expired' };
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.telegramLinkCode.findUnique({ where: { code }, select: { id: true, userId: true, expiresAt: true } });
      if (!row || row.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'invalid_or_expired' } as const;

      const claimed = await tx.telegramLinkCode.deleteMany({ where: { id: row.id } });
      if (claimed.count !== 1) return { ok: false, reason: 'invalid_or_expired' } as const; // kalah balapan dengan pemakaian lain

      const owner = await tx.user.findUnique({ where: { telegramChatId: chatId }, select: { id: true } });
      if (owner && owner.id !== row.userId) throw new ChatTaken();

      const user = await tx.user.update({
        where: { id: row.userId },
        data: { telegramChatId: chatId, telegramPending: null, telegramPendingAt: null },
        select: { id: true, username: true },
      });
      return { ok: true, userId: user.id, username: user.username } as const;
    });
  } catch (e) {
    if (e instanceof ChatTaken) return { ok: false, reason: 'chat_taken' };
    if ((e as any)?.code === 'P2002') return { ok: false, reason: 'chat_taken' };
    throw e;
  }
}

export async function unlinkByChat(chatId: string): Promise<boolean> {
  const res = await prisma.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null, telegramPending: null, telegramPendingAt: null } });
  return res.count > 0;
}

export async function unlinkByUser(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { telegramChatId: null, telegramPending: null, telegramPendingAt: null } });
}

export interface LinkedUser {
  id: string;
  username: string;
  displayName: string | null;
  role: 'ADMIN' | 'USER';
  plan: 'FREE' | 'PRO';
  planExpiresAt: Date | null;
  telegramPending: string | null;
  telegramPendingAt: Date | null;
}

// Memuat user dari chatId. Satu-satunya cara bot mengetahui "siapa" yang berbicara.
export async function getUserByChat(chatId: string): Promise<LinkedUser | null> {
  return prisma.user.findUnique({
    where: { telegramChatId: chatId },
    select: { id: true, username: true, displayName: true, role: true, plan: true, planExpiresAt: true, telegramPending: true, telegramPendingAt: true },
  });
}

export async function setPending(userId: string, command: string, now: Date = new Date()): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { telegramPending: command, telegramPendingAt: now } });
}

export async function clearPending(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { telegramPending: null, telegramPendingAt: null } });
}

// Perintah menunggu masukan berikutnya, bila masih dalam 10 menit.
export function activePending(u: Pick<LinkedUser, 'telegramPending' | 'telegramPendingAt'>, now: Date = new Date()): string | null {
  if (!u.telegramPending || !u.telegramPendingAt) return null;
  return now.getTime() - u.telegramPendingAt.getTime() <= PENDING_TTL_MS ? u.telegramPending : null;
}
