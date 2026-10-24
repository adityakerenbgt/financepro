import { NextRequest, NextResponse } from 'next/server';
import { createSavingsInvestment, getSavingsInvestments } from '@/lib/services';
import { requirePro } from '@/lib/auth';
import prisma from '@/lib/db';
import { getOrCreateAccount, planLimitResponse } from '@/lib/planLimits';
import { parseDate } from '@/lib/utils';
import { SavingsType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const { searchParams } = new URL(req.url);
    const items = await getSavingsInvestments(user.userId, {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      type: searchParams.get('type') || undefined,
      instrument: searchParams.get('instrument') || undefined,
    });
    return NextResponse.json(items);
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const body = await req.json();
    const { date, assetType, instrumentName, transactionType, nominal, pricePerUnit, account, notes } = body;
    if (!date || !assetType || !instrumentName || !transactionType || !nominal || !account) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const item = await createSavingsInvestment(user.userId, { date, assetType, instrumentName, transactionType, nominal: parseFloat(nominal), pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : undefined, account, notes });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const body = await req.json();
    const { id, date, assetType, instrumentName, transactionType, nominal, pricePerUnit, account, notes } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const existing = await prisma.savingsInvestment.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const acc = await getOrCreateAccount(user.userId, account);
    const newNominal = parseFloat(nominal);
    const pp = pricePerUnit ? parseFloat(pricePerUnit) : null;
    const item = await prisma.savingsInvestment.update({
      where: { id },
      data: { date: parseDate(date), assetType, instrumentName, transactionType: transactionType as SavingsType, nominal: newNominal, pricePerUnit: pp, units: pp ? newNominal / pp : null, accountId: acc.id, notes: notes || null },
      include: { account: true },
    });
    return NextResponse.json(item);
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
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
    const existing = await prisma.savingsInvestment.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.savingsInvestment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
