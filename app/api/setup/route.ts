import { NextRequest, NextResponse } from 'next/server';
import { getCategories, getAccounts, getUserProfile } from '@/lib/services';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { getOrCreateAccount, planLimitResponse } from '@/lib/planLimits';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [profile, categories, accounts] = await Promise.all([
      getUserProfile(user.userId),
      getCategories(user.userId),
      getAccounts(user.userId),
    ]);

    const goals = await prisma.goal.findMany({ where: { userId: user.userId }, select: { goalName: true } });
    const debts = await prisma.debt.findMany({ where: { userId: user.userId }, select: { debtName: true, debtType: true } });
    const assets = await prisma.asset.findMany({ where: { userId: user.userId }, select: { instrumentName: true, assetType: true } });

    return NextResponse.json({
      profile,
      categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
      accounts: accounts.map(a => ({ id: a.id, name: a.name, type: a.type, balance: a.balance })),
      goals: goals.map(g => g.goalName),
      debts: debts.map(d => ({ name: d.debtName, type: d.debtType })),
      assets: assets.map(a => ({ name: a.instrumentName, type: a.assetType })),
    });
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

    const body = await req.json();

    if (body.type === 'profile' || !body.type) {
      const profile = await prisma.userProfile.upsert({
        where: { userId: user.userId },
        update: {
          name: body.name,
          currency: body.currency,
          targetSavings: body.targetSavings ? parseFloat(body.targetSavings) : null,
          targetExpense: body.targetExpense ? parseFloat(body.targetExpense) : null,
          emailDigest: typeof body.emailDigest === 'boolean' ? body.emailDigest : undefined,
        },
        create: {
          userId: user.userId,
          name: body.name || 'User',
          currency: body.currency || 'IDR',
          targetSavings: body.targetSavings ? parseFloat(body.targetSavings) : null,
          targetExpense: body.targetExpense ? parseFloat(body.targetExpense) : null,
          emailDigest: typeof body.emailDigest === 'boolean' ? body.emailDigest : undefined,
        },
      });
      return NextResponse.json(profile);
    }

    if (body.type === 'category') {
      if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
      const cat = await prisma.category.upsert({
        where: { userId_name: { userId: user.userId, name: body.name } },
        update: { type: body.catType || 'expense' },
        create: { userId: user.userId, name: body.name, type: body.catType || 'expense' },
      });
      return NextResponse.json(cat);
    }

    if (body.type === 'account') {
      if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
      await getOrCreateAccount(user.userId, body.name);
      const acc = await prisma.account.upsert({
        where: { userId_name: { userId: user.userId, name: body.name } },
        update: { type: body.accType || 'bank' },
        create: { userId: user.userId, name: body.name, type: body.accType || 'bank' },
      });
      return NextResponse.json(acc);
    }

    return NextResponse.json({ error: 'unknown type' }, { status: 400 });
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const profile = await prisma.userProfile.upsert({
      where: { userId: user.userId },
      update: {
        name: body.name,
        currency: body.currency,
        targetSavings: body.targetSavings ? parseFloat(body.targetSavings) : null,
        targetExpense: body.targetExpense ? parseFloat(body.targetExpense) : null,
          emailDigest: typeof body.emailDigest === 'boolean' ? body.emailDigest : undefined,
      },
      create: {
        userId: user.userId,
        name: body.name || 'User',
        currency: body.currency || 'IDR',
        targetSavings: body.targetSavings ? parseFloat(body.targetSavings) : null,
        targetExpense: body.targetExpense ? parseFloat(body.targetExpense) : null,
          emailDigest: typeof body.emailDigest === 'boolean' ? body.emailDigest : undefined,
      },
    });
    return NextResponse.json(profile);
  } catch (error: any) {
    const limited = planLimitResponse(error);
    if (limited) return limited;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
