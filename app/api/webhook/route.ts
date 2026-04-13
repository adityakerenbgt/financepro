// ============================================================
// Telegram Webhook Handler
// Receives updates from Telegram and passes to grammY bot
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createBot } from '@/lib/telegramBot';
import { webhookCallback } from 'grammy';

// Cache bot instance to avoid re-creating on every request
let botInstance: ReturnType<typeof createBot> | null = null;

function getBot() {
  if (!botInstance) {
    botInstance = createBot();
  }
  return botInstance;
}

export async function POST(req: NextRequest) {
  try {
    const bot = getBot();
    const handler = webhookCallback(bot, 'std/http');

    // Convert Next.js request to standard Request for grammY
    const response = await handler(req);
    return response;
  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}

// Telegram sends GET to verify webhook — just return OK
export async function GET() {
  return NextResponse.json({ status: 'FinancePro bot webhook is active' });
}
