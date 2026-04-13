import { NextRequest, NextResponse } from 'next/server';
import { createTransaction, getTransactions } from '@/lib/services';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { parseDate, getMonthString, getWeekString } from '@/lib/utils';
import { TransactionType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const result = await getTransactions(user.userId, {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      type: searchParams.get('type') || undefined,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.has('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.has('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { date, category, description, account, type, amount, note } = body;
    if (!date || !category || !description || !account || !type || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['Pemasukan', 'Pengeluaran'].includes(type)) {
      return NextResponse.json({ error: 'type must be "Pemasukan" or "Pengeluaran"' }, { status: 400 });
    }
    const tx = await createTransaction(user.userId, { date, category, description, account, type, amount: parseFloat(amount), note });
    return NextResponse.json(tx, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, date, category, description, account, type, amount, note } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await prisma.transaction.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    const oldDelta = existing.type === 'Pemasukan' ? -existing.amount : existing.amount;
    await prisma.account.update({ where: { id: existing.accountId }, data: { balance: { increment: oldDelta } } });

    let cat = await prisma.category.findUnique({ where: { userId_name: { userId: user.userId, name: category } } });
    if (!cat) cat = await prisma.category.create({ data: { userId: user.userId, name: category, type: type === 'Pemasukan' ? 'income' : 'expense' } });

    let acc = await prisma.account.findUnique({ where: { userId_name: { userId: user.userId, name: account } } });
    if (!acc) acc = await prisma.account.create({ data: { userId: user.userId, name: account } });

    const newDate = parseDate(date);
    const newAmount = parseFloat(amount);

    const tx = await prisma.transaction.update({
      where: { id },
      data: { date: newDate, categoryId: cat.id, description, accountId: acc.id, type: type as TransactionType, amount: newAmount, note: note || null, month: getMonthString(newDate), week: getWeekString(newDate) },
      include: { category: true, account: true },
    });

    const newDelta = type === 'Pemasukan' ? newAmount : -newAmount;
    await prisma.account.update({ where: { id: acc.id }, data: { balance: { increment: newDelta } } });

    return NextResponse.json(tx);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await prisma.transaction.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const delta = existing.type === 'Pemasukan' ? -existing.amount : existing.amount;
    await prisma.account.update({ where: { id: existing.accountId }, data: { balance: { increment: delta } } });

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
