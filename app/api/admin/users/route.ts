import { NextRequest, NextResponse } from 'next/server';
import { serverError } from '@/lib/apiError';
import { requireAdminUser } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { isTrial } from '@/lib/plan';

const USER_SELECT = {
  id: true, username: true, displayName: true,
  role: true, plan: true, planExpiresAt: true, trialEndsAt: true, createdAt: true,
} as const;


export async function GET(req: NextRequest) {
  try {
    const { user: admin, error: authError } = await requireAdminUser(req);
    if (authError) return authError;
    const users = await prisma.user.findMany({ select: USER_SELECT, orderBy: { createdAt: 'asc' } });
    return NextResponse.json(users.map(({ trialEndsAt, ...u }) => ({ ...u, isTrial: isTrial({ ...u, trialEndsAt }) })));
  } catch (error: any) {
    return serverError('admin/users', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: admin, error: authError } = await requireAdminUser(req);
    if (authError) return authError;

    const { username, displayName, password, role } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, displayName: displayName || null, password: hashedPassword, role: role === 'ADMIN' ? 'ADMIN' : 'USER' },
      select: USER_SELECT,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    return serverError('admin/users', error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user: admin, error: authError } = await requireAdminUser(req);
    if (authError) return authError;

    const body = await req.json();
    const { id, displayName, password, role, plan, planExpiresAt } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (role !== undefined) updateData.role = role === 'ADMIN' ? 'ADMIN' : 'USER';
    if (plan !== undefined) updateData.plan = plan === 'PRO' ? 'PRO' : 'FREE';
    if (planExpiresAt !== undefined) updateData.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({ where: { id }, data: updateData, select: USER_SELECT });
    return NextResponse.json(user);
  } catch (error: any) {
    return serverError('admin/users', error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user: admin, error: authError } = await requireAdminUser(req);
    if (authError) return authError;

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    if (id === admin.userId) return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return serverError('admin/users', error);
  }
}
