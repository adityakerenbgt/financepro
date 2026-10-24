import { NextResponse } from 'next/server';
import prisma from './db';
import { getEffectivePlan } from './plan';

export const FREE_ACCOUNT_LIMIT = 1;

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

export function planLimitResponse(error: unknown): NextResponse | null {
  if (error instanceof PlanLimitError) {
    return NextResponse.json({ error: error.message, code: 'PRO_REQUIRED' }, { status: 403 });
  }
  return null;
}

// Lempar PlanLimitError bila user FREE sudah memakai kuota rekening.
export async function assertCanCreateAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, plan: true, planExpiresAt: true },
  });
  if (!user) throw new Error('User tidak ditemukan');
  if (getEffectivePlan(user) === 'PRO') return;
  const count = await prisma.account.count({ where: { userId } });
  if (count >= FREE_ACCOUNT_LIMIT) {
    throw new PlanLimitError(`Paket FREE dibatasi ${FREE_ACCOUNT_LIMIT} rekening. Upgrade ke PRO untuk menambah rekening.`);
  }
}

export async function getOrCreateAccount(userId: string, name: string) {
  const existing = await prisma.account.findUnique({ where: { userId_name: { userId, name } } });
  if (existing) return existing;
  await assertCanCreateAccount(userId);
  return prisma.account.create({ data: { userId, name } });
}
