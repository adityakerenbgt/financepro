import prisma from './db';
import { getEffectivePlan, isTrial } from './plan';

const DAY = 24 * 60 * 60 * 1000;
const WIB_OFFSET = 7 * 60 * 60 * 1000; // pekan dihitung dalam WIB (UTC+7), Senin 00:00 sebagai awal pekan
export const WEEKS_SHOWN = 12;

export interface AnalyticsUser {
  plan: 'FREE' | 'PRO';
  role: 'ADMIN' | 'USER';
  planExpiresAt: Date | null;
  trialEndsAt: Date | null;
  createdAt: Date;
  lastLogin: Date | null;
  id: string;
}

export interface ApprovedPayment {
  userId: string;
  plan: 'PRO_MONTHLY' | 'PRO_YEARLY';
  amount: number;
  at: Date; // waktu disetujui (fallback: dibuat)
}

export interface WeeklyPoint {
  weekStart: string; // tanggal Senin (WIB), YYYY-MM-DD
  newUsers: number;
  totalUsers: number; // kumulatif sampai akhir pekan itu
}

export interface Analytics {
  generatedAt: string;
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  activeUsers30d: number;
  plans: { free: number; pro: number; trial: number };
  conversion: { convertedUsers: number; rate: number };
  mrr: number;
  payingSubscribers: number;
  pendingPayments: number;
  weekly: WeeklyPoint[];
}

// Awal pekan (Senin 00:00 WIB) dari sebuah waktu, dalam ms UTC.
function weekStartMs(d: Date): number {
  const local = new Date(d.getTime() + WIB_OFFSET);
  const dow = (local.getUTCDay() + 6) % 7; // Senin = 0
  const localMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return localMidnight - dow * DAY - WIB_OFFSET;
}

// Fungsi murni: seluruh metrik dihitung dari daftar user (role USER saja) dan pembayaran yang disetujui.
// Definisi lengkap ada di halaman admin analytics; ringkasnya:
// - aktif = lastLogin dalam 30 hari terakhir
// - FREE/PRO/trial memakai plan EFEKTIF (kedaluwarsa dihitung FREE); PRO = PRO non-trial
// - konversi = user dengan >= 1 pembayaran disetujui / total user
// - MRR = jumlah (bulanan: nominal; tahunan: nominal / 12) dari PRO aktif non-trial yang punya pembayaran disetujui,
//   memakai pembayaran disetujui TERAKHIR dan nominal yang tersimpan saat itu
export function computeAnalytics(
  users: AnalyticsUser[],
  approved: ApprovedPayment[],
  pendingPayments: number,
  now: Date = new Date(),
): Analytics {
  const nowMs = now.getTime();
  const plans = { free: 0, pro: 0, trial: 0 };
  let newUsers7d = 0, newUsers30d = 0, activeUsers30d = 0;

  const latestByUser = new Map<string, ApprovedPayment>();
  for (const p of approved) {
    const cur = latestByUser.get(p.userId);
    if (!cur || p.at.getTime() > cur.at.getTime()) latestByUser.set(p.userId, p);
  }

  let mrr = 0, payingSubscribers = 0;
  const userIds = new Set(users.map(u => u.id));
  let convertedUsers = 0;
  for (const id of latestByUser.keys()) if (userIds.has(id)) convertedUsers++;

  for (const u of users) {
    const age = nowMs - u.createdAt.getTime();
    if (age <= 7 * DAY) newUsers7d++;
    if (age <= 30 * DAY) newUsers30d++;
    if (u.lastLogin && nowMs - u.lastLogin.getTime() <= 30 * DAY) activeUsers30d++;

    const effective = getEffectivePlan(u, now);
    if (effective === 'FREE') plans.free++;
    else if (isTrial(u, now)) plans.trial++;
    else {
      plans.pro++;
      const pay = latestByUser.get(u.id);
      if (pay) {
        mrr += pay.plan === 'PRO_YEARLY' ? pay.amount / 12 : pay.amount;
        payingSubscribers++;
      }
    }
  }

  const currentWeek = weekStartMs(now);
  const weekly: WeeklyPoint[] = [];
  for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
    const start = currentWeek - i * 7 * DAY;
    const end = start + 7 * DAY;
    weekly.push({
      weekStart: new Date(start + WIB_OFFSET).toISOString().slice(0, 10),
      newUsers: users.filter(u => u.createdAt.getTime() >= start && u.createdAt.getTime() < end).length,
      totalUsers: users.filter(u => u.createdAt.getTime() < end).length,
    });
  }

  return {
    generatedAt: now.toISOString(),
    totalUsers: users.length,
    newUsers7d,
    newUsers30d,
    activeUsers30d,
    plans,
    conversion: { convertedUsers, rate: users.length > 0 ? convertedUsers / users.length : 0 },
    mrr,
    payingSubscribers,
    pendingPayments,
    weekly,
  };
}

export async function getAnalytics(now: Date = new Date()): Promise<Analytics> {
  const [users, approved, pending] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, role: true, plan: true, planExpiresAt: true, trialEndsAt: true, createdAt: true, lastLogin: true },
    }),
    prisma.paymentRequest.findMany({
      where: { status: 'APPROVED', user: { role: 'USER' } },
      select: { userId: true, plan: true, amount: true, reviewedAt: true, createdAt: true },
    }),
    prisma.paymentRequest.count({ where: { status: 'PENDING' } }),
  ]);
  return computeAnalytics(
    users,
    approved.map(p => ({ userId: p.userId, plan: p.plan, amount: p.amount, at: p.reviewedAt ?? p.createdAt })),
    pending,
    now,
  );
}
