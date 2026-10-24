import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from './db';
import { JWT_SECRET } from './env';
import { getEffectivePlan } from './plan';

export interface AuthUser {
  userId: string;
  username: string;
  role: 'ADMIN' | 'USER';
  // Dari JWT: bisa basi sampai 30 hari. Jangan dipakai untuk keputusan akses; pakai getCurrentUser/requirePro.
  plan: 'FREE' | 'PRO';
}

export function getUserFromRequest(req: NextRequest): AuthUser | null {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

// Verifikasi JWT lalu muat role & plan terbaru dari DB (plan = plan efektif, memperhitungkan kedaluwarsa).
export async function getCurrentUser(req: NextRequest): Promise<AuthUser | null> {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: tokenUser.userId },
    select: { id: true, username: true, role: true, plan: true, planExpiresAt: true },
  });
  if (!dbUser) return null;
  return {
    userId: dbUser.id,
    username: dbUser.username,
    role: dbUser.role,
    plan: getEffectivePlan(dbUser),
  };
}

type GuardResult = { user: AuthUser; error: null } | { user: null; error: NextResponse };

export async function requireAdminUser(req: NextRequest): Promise<GuardResult> {
  const user = await getCurrentUser(req);
  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (user.role !== 'ADMIN') return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user, error: null };
}

export async function requirePro(req: NextRequest): Promise<GuardResult> {
  const user = await getCurrentUser(req);
  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isPro(user)) return { user: null, error: NextResponse.json({ error: 'Fitur PRO', code: 'PRO_REQUIRED' }, { status: 403 }) };
  return { user, error: null };
}

export function requireAuth(req: NextRequest): AuthUser {
  const user = getUserFromRequest(req);
  if (!user) throw new Error('Unauthorized');
  return user;
}

export function requireAdmin(req: NextRequest): AuthUser {
  const user = requireAuth(req);
  if (user.role !== 'ADMIN') throw new Error('Forbidden: Admin only');
  return user;
}

export function isPro(user: AuthUser): boolean {
  return user.role === 'ADMIN' || user.plan === 'PRO';
}
