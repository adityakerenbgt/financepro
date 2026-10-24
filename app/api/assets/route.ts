import { NextRequest, NextResponse } from 'next/server';
import { getAssetSummaries } from '@/lib/services';
import { requirePro } from '@/lib/auth';
import prisma from '@/lib/db';
import { parseDate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const assets = await getAssetSummaries(user.userId);
    return NextResponse.json(assets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePro(req);
    if (auth.error) return auth.error;
    const user = auth.user;
    const { assetType, instrumentName, initialCapital, currentValue, startDate } = await req.json();
    if (!assetType || !instrumentName) return NextResponse.json({ error: 'assetType and instrumentName are required' }, { status: 400 });
    const asset = await prisma.asset.upsert({
      where: { userId_instrumentName: { userId: user.userId, instrumentName } },
      update: { currentValue: parseFloat(currentValue || '0'), lastUpdated: new Date() },
      create: { userId: user.userId, assetType, instrumentName, initialCapital: parseFloat(initialCapital || '0'), currentValue: parseFloat(currentValue || '0'), startDate: startDate ? parseDate(startDate) : null },
    });
    return NextResponse.json(asset, { status: 201 });
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
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const existing = await prisma.asset.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (body.assetType !== undefined) {
      const asset = await prisma.asset.update({ where: { id }, data: { assetType: body.assetType, instrumentName: body.instrumentName, initialCapital: parseFloat(body.initialCapital || '0'), currentValue: parseFloat(body.currentValue || '0'), startDate: body.startDate ? parseDate(body.startDate) : null, lastUpdated: new Date() } });
      return NextResponse.json(asset);
    }
    const asset = await prisma.asset.update({ where: { id }, data: { currentValue: parseFloat(body.currentValue || '0'), lastUpdated: new Date() } });
    return NextResponse.json(asset);
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
    const existing = await prisma.asset.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.asset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
