import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Clear all user data when logging out
    // Delete all transactions, transfers, debts, etc.
    await Promise.all([
      prisma.transaction.deleteMany({}),
      prisma.transfer.deleteMany({}),
      prisma.savingsInvestment.deleteMany({}),
      prisma.account.deleteMany({}),
      prisma.category.deleteMany({}),
      prisma.debt.deleteMany({}),
      prisma.budget.deleteMany({}),
      prisma.goal.deleteMany({}),
      prisma.asset.deleteMany({}),
    ]);

    // Clear auth cookie
    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.delete('auth-token');

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
