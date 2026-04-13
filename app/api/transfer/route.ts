import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { parseDate } from '@/lib/utils';
import { format } from 'date-fns';

function generateTrfId(date: Date, seq: number): string {
  return `TRF-${format(date, 'yyyyMMdd')}-${String(seq).padStart(3, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const transfers = await prisma.transfer.findMany({
      where: { userId: user.userId },
      orderBy: { date: 'desc' },
      include: { fromAccount: true, toAccount: true },
    });
    return NextResponse.json(transfers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { date, fromAccount, toAccount, amount, notes } = await req.json();
    if (!date || !fromAccount || !toAccount || !amount) {
      return NextResponse.json({ error: 'date, fromAccount, toAccount, amount are required' }, { status: 400 });
    }
    if (fromAccount === toAccount) {
      return NextResponse.json({ error: 'Rekening asal dan tujuan tidak boleh sama' }, { status: 400 });
    }

    const [fromAcc, toAcc] = await Promise.all([
      prisma.account.findUnique({ where: { userId_name: { userId: user.userId, name: fromAccount } } }),
      prisma.account.findUnique({ where: { userId_name: { userId: user.userId, name: toAccount } } }),
    ]);
    if (!fromAcc) return NextResponse.json({ error: `Rekening "${fromAccount}" tidak ditemukan` }, { status: 404 });
    if (!toAcc) return NextResponse.json({ error: `Rekening "${toAccount}" tidak ditemukan` }, { status: 404 });

    const parsedDate = parseDate(date);
    const parsedAmount = parseFloat(amount);

    // Generate ID
    const count = await prisma.transfer.count({ where: { userId: user.userId, date: { gte: new Date(parsedDate.setHours(0,0,0,0)) } } });
    const txId = generateTrfId(parseDate(date), count + 1);

    const transfer = await prisma.transfer.create({
      data: { userId: user.userId, txId, date: parseDate(date), fromAccountId: fromAcc.id, toAccountId: toAcc.id, amount: parsedAmount, notes: notes || null },
      include: { fromAccount: true, toAccount: true },
    });

    // Update balances
    await Promise.all([
      prisma.account.update({ where: { id: fromAcc.id }, data: { balance: { decrement: parsedAmount } } }),
      prisma.account.update({ where: { id: toAcc.id }, data: { balance: { increment: parsedAmount } } }),
    ]);

    return NextResponse.json(transfer, { status: 201 });
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

    const transfer = await prisma.transfer.findFirst({ where: { id, userId: user.userId } });
    if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Reverse balances
    await Promise.all([
      prisma.account.update({ where: { id: transfer.fromAccountId }, data: { balance: { increment: transfer.amount } } }),
      prisma.account.update({ where: { id: transfer.toAccountId }, data: { balance: { decrement: transfer.amount } } }),
    ]);

    await prisma.transfer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
