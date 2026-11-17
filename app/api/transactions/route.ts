import { NextRequest, NextResponse } from 'next/server';
import { serverError } from '@/lib/apiError';
import { parseBody, transactionCreateSchema, transactionUpdateSchema } from '@/lib/validators';
import { createTransaction, getTransactions } from '@/lib/services';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { getOrCreateAccount, planLimitResponse } from '@/lib/planLimits';
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
    const limited = planLimitResponse(error);
    if (limited) return limited;
    return serverError('transactions', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = parseBody(transactionCreateSchema, await req.json().catch(() => null));
    if (!parsed.ok) return parsed.response;
    const tx = await createTransaction(user.userId, parsed.data);
    return NextResponse.json(tx, { status: 201 });
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    return serverError('transactions', error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = parseBody(transactionUpdateSchema, await req.json().catch(() => null));
    if (!parsed.ok) return parsed.response;
    const { id, date, category, description, account, type, amount: newAmount, note } = parsed.data;

    const existing = await prisma.transaction.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    // Cari/buat kategori & rekening DULU (bisa melempar batas paket FREE). Saldo baru disentuh di dalam satu transaksi
    // database di bawah, jadi kegagalan di sini tidak pernah meninggalkan saldo setengah berubah (T-DEBT-5).
    let cat = await prisma.category.findUnique({ where: { userId_name: { userId: user.userId, name: category } } });
    if (!cat) cat = await prisma.category.create({ data: { userId: user.userId, name: category, type: type === 'Pemasukan' ? 'income' : 'expense' } });

    const acc = await getOrCreateAccount(user.userId, account);

    const newDate = parseDate(date);
    const oldDelta = existing.type === 'Pemasukan' ? -existing.amount : existing.amount;
    const newDelta = type === 'Pemasukan' ? newAmount : -newAmount;

    const [, tx] = await prisma.$transaction([
      prisma.account.update({ where: { id: existing.accountId }, data: { balance: { increment: oldDelta } } }),
      prisma.transaction.update({
        where: { id },
        data: { date: newDate, categoryId: cat.id, description, accountId: acc.id, type: type as TransactionType, amount: newAmount, note: note || null, month: getMonthString(newDate), week: getWeekString(newDate) },
        include: { category: true, account: true },
      }),
      prisma.account.update({ where: { id: acc.id }, data: { balance: { increment: newDelta } } }),
    ]);

    return NextResponse.json(tx);
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    return serverError('transactions', error);
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
    await prisma.$transaction([
      prisma.account.update({ where: { id: existing.accountId }, data: { balance: { increment: delta } } }),
      prisma.transaction.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    return serverError('transactions', error);
  }
}
