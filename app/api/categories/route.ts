import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const categories = await prisma.category.findMany({
      where: { userId: user.userId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { transactions: true } } },
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, type } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const category = await prisma.category.create({
      data: { userId: user.userId, name: name.trim(), type: type || 'expense' },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Nama kategori sudah ada' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, type } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await prisma.category.findFirst({ where: { id, userId: user.userId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const category = await prisma.category.update({
      where: { id },
      data: { name: name?.trim() || undefined, type: type || undefined },
    });
    return NextResponse.json(category);
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Nama kategori sudah ada' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await prisma.category.findFirst({ where: { id, userId: user.userId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const txCount = await prisma.transaction.count({ where: { categoryId: id, userId: user.userId } });
    if (txCount > 0) return NextResponse.json({ error: `Kategori tidak bisa dihapus karena digunakan di ${txCount} transaksi` }, { status: 400 });

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
