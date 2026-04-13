import { NextRequest, NextResponse } from 'next/server';
import { createSavingsInvestment, getSavingsInvestments } from '@/lib/services';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { parseDate } from '@/lib/utils';
import { SavingsType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const items = await getSavingsInvestments(user.userId, {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      type: searchParams.get('type') || undefined,
      instrument: searchParams.get('instrument') || undefined,
    });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { date, assetType, instrumentName, transactionType, nominal, pricePerUnit, account, notes } = body;
    if (!date || !assetType || !instrumentName || !transactionType || !nominal || !account) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const item = await createSavingsInvestment(user.userId, { date, assetType, instrumentName, transactionType, nominal: parseFloat(nominal), pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : undefined, account, notes });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { id, date, assetType, instrumentName, transactionType, nominal, pricePerUnit, account, notes } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const existing = await prisma.savingsInvestment.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    let acc = await prisma.account.findUnique({ where: { userId_name: { userId: user.userId, name: account } } });
    if (!acc) acc = await prisma.account.create({ data: { userId: user.userId, name: account } });
    const newNominal = parseFloat(nominal);
    const pp = pricePerUnit ? parseFloat(pricePerUnit) : null;
    const item = await prisma.savingsInvestment.update({
      where: { id },
      data: { date: parseDate(date), assetType, instrumentName, transactionType: transactionType as SavingsType, nominal: newNominal, pricePerUnit: pp, units: pp ? newNominal / pp : null, accountId: acc.id, notes: notes || null },
      include: { account: true },
    });
    return NextResponse.json(item);
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
    const existing = await prisma.savingsInvestment.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.savingsInvestment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
