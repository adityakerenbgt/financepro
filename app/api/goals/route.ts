import { NextRequest, NextResponse } from 'next/server';
import { getGoalSummaries } from '@/lib/services';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { parseDate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const goals = await getGoalSummaries(user.userId);
    return NextResponse.json(goals);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { goalName, targetAmount, targetDate } = await req.json();
    if (!goalName || !targetAmount || !targetDate) {
      return NextResponse.json({ error: 'goalName, targetAmount, and targetDate are required' }, { status: 400 });
    }
    const goal = await prisma.goal.create({
      data: { userId: user.userId, goalName, targetAmount: parseFloat(targetAmount), targetDate: parseDate(targetDate) },
    });
    return NextResponse.json(goal, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, goalName, targetAmount, targetDate } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const existing = await prisma.goal.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const goal = await prisma.goal.update({
      where: { id },
      data: { goalName, targetAmount: parseFloat(targetAmount), targetDate: parseDate(targetDate) },
    });
    return NextResponse.json(goal);
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
    const existing = await prisma.goal.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
