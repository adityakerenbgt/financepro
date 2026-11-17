import { NextRequest, NextResponse } from 'next/server';
import { serverError } from '@/lib/apiError';
import { parseBody, debtCreateSchema } from '@/lib/validators';
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
    return serverError('debts', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const parsed = parseBody(debtCreateSchema, await req.json().catch(() => null));
    if (!parsed.ok) return parsed.response;
    const { debtType, debtName, limitOrPrincipal, interestRate, tenor, monthlyPayment, startDate, isPiutang } = parsed.data;
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
      data: { userId: user.userId, debtType: debtType as DebtType, debtName, limitOrPrincipal, interestRate: interestRate ?? 0, tenor: tenor ?? null, monthlyPayment: monthlyPayment ?? null, startDate: startDate ? parseDate(startDate) : null, isPiutang: !!isPiutang },
    });
    return NextResponse.json(debt, { status: 201 });
  } catch (error: any) {
    return serverError('debts', error);
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
    return serverError('debts', error);
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
    return serverError('debts', error);
  }
}
