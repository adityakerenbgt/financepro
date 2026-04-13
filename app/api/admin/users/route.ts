import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

function requireAdmin(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return null;
  if (user.role !== 'ADMIN') return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const users = await prisma.user.findMany({
      select: { id: true, username: true, displayName: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { username, displayName, password, role } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, displayName: displayName || null, password: hashedPassword, role: role === 'ADMIN' ? 'ADMIN' : 'USER' },
      select: { id: true, username: true, displayName: true, role: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, displayName, password, role } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (role !== undefined) updateData.role = role === 'ADMIN' ? 'ADMIN' : 'USER';
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, displayName: true, role: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    if (id === admin.userId) return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
