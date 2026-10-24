import { NextRequest, NextResponse } from 'next/server';
import { getBudgetSummaries } from '@/lib/services';
import { requirePro } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || undefined;
    const summaries = await getBudgetSummaries(user.userId, month);
    return NextResponse.json(summaries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const { month, category, amount } = await req.json();
    if (!month || !category || amount === undefined) return NextResponse.json({ error: 'month, category, and amount are required' }, { status: 400 });
    let cat = await prisma.category.findUnique({ where: { userId_name: { userId: user.userId, name: category } } });
    if (!cat) cat = await prisma.category.create({ data: { userId: user.userId, name: category, type: 'expense' } });
    const budget = await prisma.budget.upsert({
      where: { userId_month_categoryId: { userId: user.userId, month, categoryId: cat.id } },
      update: { amount: parseFloat(amount) },
      create: { userId: user.userId, month, categoryId: cat.id, amount: parseFloat(amount) },
      include: { category: true },
    });
    return NextResponse.json(budget, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const { id, amount } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const existing = await prisma.budget.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const budget = await prisma.budget.update({ where: { id }, data: { amount: parseFloat(amount) }, include: { category: true } });
    return NextResponse.json(budget);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const existing = await prisma.budget.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
