export type EffectivePlan = 'FREE' | 'PRO';

export interface PlanSource {
  role: 'ADMIN' | 'USER';
  plan: 'FREE' | 'PRO';
  planExpiresAt: Date | null;
}

export interface TrialSource extends PlanSource {
  trialEndsAt: Date | null;
}

// Fungsi murni: plan yang berlaku saat ini. ADMIN selalu PRO; PRO yang sudah lewat planExpiresAt = FREE.
export function getEffectivePlan(user: PlanSource, now: Date = new Date()): EffectivePlan {
  if (user.role === 'ADMIN') return 'PRO';
  if (user.plan !== 'PRO') return 'FREE';
  if (user.planExpiresAt && user.planExpiresAt.getTime() <= now.getTime()) return 'FREE';
  return 'PRO';
}

// User sedang dalam masa trial bila PRO-nya masih berlaku DAN masa aktifnya masih persis sama dengan akhir trial.
// Begitu masa aktif diubah (admin atau pembayaran disetujui), user dianggap berbayar/manual, bukan trial.
export function isTrial(user: TrialSource, now: Date = new Date()): boolean {
  if (getEffectivePlan(user, now) !== 'PRO') return false;
  if (user.role !== 'USER' || !user.trialEndsAt || !user.planExpiresAt) return false;
  return user.planExpiresAt.getTime() === user.trialEndsAt.getTime();
}

// Sisa hari (dibulatkan ke atas) sampai tanggal berakhir; 0 bila sudah lewat.
export function daysLeft(until: Date, now: Date = new Date()): number {
  const ms = until.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000));
}
