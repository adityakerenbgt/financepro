import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { parseDate, getMonthString, getWeekString, generateTxId } from '@/lib/utils';
import { startOfDay, endOfDay } from 'date-fns';
import { TransactionType } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { debtId, isPiutang, debtName, amount, date, notes, accountId } = await req.json();
    if (!debtId || !amount || !date || !accountId) {
      return NextResponse.json({ error: 'debtId, amount, date, accountId are required' }, { status: 400 });
    }

    // Verify debt belongs to user
    const debt = await prisma.debt.findFirst({ where: { id: debtId, userId: user.userId } });
    if (!debt) return NextResponse.json({ error: 'Debt not found' }, { status: 404 });

    // Verify account belongs to user
    const account = await prisma.account.findFirst({ where: { id: accountId, userId: user.userId } });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const parsedDate = parseDate(date);
    const month = getMonthString(parsedDate);
    const week = getWeekString(parsedDate);

    // Generate txId
    const dayStart = startOfDay(parsedDate);
    const dayEnd = endOfDay(parsedDate);
    const count = await prisma.transaction.count({
      where: { userId: user.userId, date: { gte: dayStart, lte: dayEnd } },
    });
    const txId = generateTxId(parsedDate, count + 1);

    // Ensure or create the category
    const categoryName = isPiutang ? debtName : 'Cicilan';
    let category = await prisma.category.findUnique({
      where: { userId_name: { userId: user.userId, name: categoryName } },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { userId: user.userId, name: categoryName, type: isPiutang ? 'income' : 'expense' },
      });
    }

    // Create transaction
    const txType = isPiutang ? 'Pemasukan' : 'Pengeluaran';
    const description = isPiutang ? `Penerimaan dari ${debtName}` : `Pembayaran ${debtName}`;

    const tx = await prisma.transaction.create({
      data: {
        userId: user.userId,
        txId,
        date: parsedDate,
        categoryId: category.id,
        description,
        accountId,
        type: txType as TransactionType,
        amount: parseFloat(amount),
        note: notes || null,
        month,
        week,
      },
      include: { category: true, account: true },
    });

    // Update account balance
    const balanceChange = isPiutang ? parseFloat(amount) : -parseFloat(amount);
    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: balanceChange } },
    });

    return NextResponse.json(tx, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const debtId = new URL(req.url).searchParams.get('debtId');
    if (!debtId) return NextResponse.json({ error: 'debtId is required' }, { status: 400 });

    // Verify debt belongs to user
    const debt = await prisma.debt.findFirst({ where: { id: debtId, userId: user.userId } });
    if (!debt) return NextResponse.json({ error: 'Debt not found' }, { status: 404 });

    // Find payments scoped to user
    const payments = await prisma.transaction.findMany({
      where: {
        userId: user.userId,
        OR: [
          { category: { name: debt.debtName }, type: 'Pemasukan' },
          { description: { contains: debt.debtName }, type: 'Pengeluaran' },
        ],
      },
      orderBy: { date: 'desc' },
      include: { category: true },
    });

    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
