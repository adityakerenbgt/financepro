import { NextRequest, NextResponse } from 'next/server';
import { getDebtSummaries } from '@/lib/services';
import { requirePro } from '@/lib/auth';
import prisma from '@/lib/db';
import { parseDate } from '@/lib/utils';
import { DebtType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const debts = await getDebtSummaries(user.userId);
    return NextResponse.json(debts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const body = await req.json();
    const { debtType, debtName, limitOrPrincipal, interestRate, tenor, monthlyPayment, startDate, isPiutang } = body;
    if (!debtType || !debtName || limitOrPrincipal === undefined) {
      return NextResponse.json({ error: 'debtType, debtName, and limitOrPrincipal are required' }, { status: 400 });
    }
    if (debtType === 'Revolving' && !isPiutang) {
      await prisma.account.upsert({
        where: { userId_name: { userId: user.userId, name: debtName } },
        update: { isDebt: true },
        create: { userId: user.userId, name: debtName, type: 'credit_card', isDebt: true },
      });
    }
    if (isPiutang) {
      await prisma.category.upsert({
        where: { userId_name: { userId: user.userId, name: debtName } },
        update: { type: 'income' },
        create: { userId: user.userId, name: debtName, type: 'income' },
      });
    }
    const debt = await prisma.debt.create({
      data: { userId: user.userId, debtType: debtType as DebtType, debtName, limitOrPrincipal: parseFloat(limitOrPrincipal), interestRate: parseFloat(interestRate || '0'), tenor: tenor ? parseInt(tenor) : null, monthlyPayment: monthlyPayment ? parseFloat(monthlyPayment) : null, startDate: startDate ? parseDate(startDate) : null, isPiutang: !!isPiutang },
    });
    return NextResponse.json(debt, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const body = await req.json();
    const { id, debtType, debtName, limitOrPrincipal, interestRate, tenor, monthlyPayment, startDate, isPiutang } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const existing = await prisma.debt.findFirst({ where: { id, userId: user.userId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const debt = await prisma.debt.update({
      where: { id },
      data: { debtType: debtType as DebtType, debtName, limitOrPrincipal: parseFloat(limitOrPrincipal), interestRate: parseFloat(interestRate || '0'), tenor: tenor ? parseInt(tenor) : null, monthlyPayment: monthlyPayment ? parseFloat(monthlyPayment) : null, startDate: startDate ? parseDate(startDate) : null, isPiutang: !!isPiutang },
    });
    return NextResponse.json(debt);
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
    const existing = await prisma.debt.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.debt.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
