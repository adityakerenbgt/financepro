import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-env';

export interface AuthUser {
  userId: string;
  username: string;
  role: 'ADMIN' | 'USER';
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
