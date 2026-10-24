import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  retryAfter: number; // detik
}

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
let warned = false;
const limiters = new Map<string, Ratelimit>();

function getUpstashLimiter(scope: string, limit: number, windowSec: number): Ratelimit {
  const id = `${scope}:${limit}:${windowSec}`;
  let l = limiters.get(id);
  if (!l) {
    l = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `fp:rl:${scope}`,
    });
    limiters.set(id, l);
  }
  return l;
}

// Fallback tanpa Upstash: memori proses. Cukup untuk dev/server tunggal; TIDAK efektif di serverless.
const memory = new Map<string, number[]>();

function memoryLimit(scope: string, key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const k = `${scope}:${key}`;
  const hits = (memory.get(k) || []).filter(t => now - t < windowMs);
  if (hits.length >= limit) {
    memory.set(k, hits);
    return { success: false, retryAfter: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }
  hits.push(now);
  memory.set(k, hits);
  return { success: true, retryAfter: 0 };
}

function warnOnce() {
  if (!warned) {
    warned = true;
    console.warn('[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN belum diset: memakai rate limit in-memory (tidak efektif di serverless).');
  }
}

export async function rateLimit(scope: string, key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  if (!hasUpstash) {
    warnOnce();
    return memoryLimit(scope, key, limit, windowSec);
  }
  try {
    const res = await getUpstashLimiter(scope, limit, windowSec).limit(key);
    return { success: res.success, retryAfter: res.success ? 0 : Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) };
  } catch (err) {
    console.error('[rateLimit] Upstash error, request diizinkan:', err instanceof Error ? err.message : err);
    return { success: true, retryAfter: 0 };
  }
}

export async function resetRateLimit(scope: string, key: string, limit: number, windowSec: number): Promise<void> {
  if (!hasUpstash) {
    memory.delete(`${scope}:${key}`);
    return;
  }
  try {
    await getUpstashLimiter(scope, limit, windowSec).resetUsedTokens(key);
  } catch {
    // abaikan
  }
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export function tooManyRequests(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Terlalu banyak percobaan, coba lagi nanti.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
