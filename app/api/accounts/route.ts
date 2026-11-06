import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { assertCanCreateAccount, planLimitResponse } from '@/lib/planLimits';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accounts = await prisma.account.findMany({
      where: { userId: user.userId },
      orderBy: [{ isDebt: 'asc' }, { name: 'asc' }],
    });

    const results = await Promise.all(accounts.map(async (acc) => {
      const [incomeAgg, expenseAgg, lastTx, transferOutAgg, transferInAgg] = await Promise.all([
        prisma.transaction.aggregate({ where: { accountId: acc.id, type: 'Pemasukan' }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { accountId: acc.id, type: 'Pengeluaran' }, _sum: { amount: true } }),
        prisma.transaction.findFirst({ where: { accountId: acc.id }, orderBy: { date: 'desc' }, select: { date: true } }),
        prisma.transfer.aggregate({ where: { fromAccountId: acc.id }, _sum: { amount: true } }),
        prisma.transfer.aggregate({ where: { toAccountId: acc.id }, _sum: { amount: true } }),
      ]);
      return {
        id: acc.id, name: acc.name, type: acc.type, balance: acc.balance, isDebt: acc.isDebt,
        totalIncome: incomeAgg._sum.amount || 0, totalExpense: expenseAgg._sum.amount || 0,
        totalTransferOut: transferOutAgg._sum.amount || 0, totalTransferIn: transferInAgg._sum.amount || 0,
        lastActivity: lastTx?.date || null, createdAt: acc.createdAt,
      };
    }));

    return NextResponse.json(results);
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, type, initialBalance } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    await assertCanCreateAccount(user.userId);
    const account = await prisma.account.create({
      data: { userId: user.userId, name: name.trim(), type: type || 'bank', balance: parseFloat(initialBalance || '0') },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    if (error.code === 'P2002') return NextResponse.json({ error: 'Nama rekening sudah ada' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, balance, name, type, notes } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await prisma.account.findFirst({ where: { id, userId: user.userId }, select: { balance: true, adjustments: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let adjustments: any[] = [];
    if (balance !== undefined && notes !== undefined) {
      adjustments = Array.isArray(existing.adjustments) ? existing.adjustments : [];
      if (balance !== existing.balance) {
        adjustments.push({ date: new Date().toISOString(), oldBalance: existing.balance, newBalance: balance, amount: balance - existing.balance, notes: notes || '' });
      }
    }

    const account = await prisma.account.update({
      where: { id },
      data: { balance: balance !== undefined ? parseFloat(balance) : undefined, name: name?.trim() || undefined, type: type || undefined, adjustments: adjustments.length > 0 ? adjustments : undefined },
    });
    return NextResponse.json(account);
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    if (error.code === 'P2002') return NextResponse.json({ error: 'Nama rekening sudah ada' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await prisma.account.findFirst({ where: { id, userId: user.userId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const txCount = await prisma.transaction.count({ where: { accountId: id, userId: user.userId } });
    if (txCount > 0) return NextResponse.json({ error: `Rekening tidak bisa dihapus karena memiliki ${txCount} transaksi` }, { status: 400 });

    const recurringCount = await prisma.recurringTransaction.count({ where: { accountId: id, userId: user.userId } });
    if (recurringCount > 0) return NextResponse.json({ error: `Rekening tidak bisa dihapus karena dipakai ${recurringCount} transaksi berulang` }, { status: 400 });

    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
