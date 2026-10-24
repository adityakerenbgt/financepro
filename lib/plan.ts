export type EffectivePlan = 'FREE' | 'PRO';

export interface PlanSource {
  role: 'ADMIN' | 'USER';
  plan: 'FREE' | 'PRO';
  planExpiresAt: Date | null;
}

// Fungsi murni: plan yang berlaku saat ini. ADMIN selalu PRO; PRO yang sudah lewat planExpiresAt = FREE.
export function getEffectivePlan(user: PlanSource, now: Date = new Date()): EffectivePlan {
  if (user.role === 'ADMIN') return 'PRO';
  if (user.plan !== 'PRO') return 'FREE';
  if (user.planExpiresAt && user.planExpiresAt.getTime() <= now.getTime()) return 'FREE';
  return 'PRO';
}
