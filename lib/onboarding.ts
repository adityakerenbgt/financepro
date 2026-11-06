import prisma from './db';
import { DEFAULT_CATEGORIES } from './defaultCategories';

// Checklist hanya ditampilkan untuk akun yang masih baru; user lama tidak terpengaruh.
export const ONBOARDING_WINDOW_DAYS = 30;

export async function seedDefaultCategories(userId: string): Promise<void> {
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map(c => ({ userId, ...c })),
    skipDuplicates: true,
  });
}

export interface OnboardingStatus {
  visible: boolean;
  steps: { account: boolean; transaction: boolean; target: boolean };
}

// Status langkah dihitung dari data (bukan flag manual).
export async function getOnboardingStatus(userId: string, now: Date = new Date()): Promise<OnboardingStatus> {
  const [user, profile, accountCount, transactionCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    prisma.userProfile.findUnique({
      where: { userId },
      select: { targetSavings: true, targetExpense: true, onboardingDismissedAt: true },
    }),
    prisma.account.count({ where: { userId } }),
    prisma.transaction.count({ where: { userId } }),
  ]);

  const steps = {
    account: accountCount > 0,
    transaction: transactionCount > 0,
    target: profile?.targetSavings != null || profile?.targetExpense != null,
  };
  const isNew = !!user && now.getTime() - user.createdAt.getTime() < ONBOARDING_WINDOW_DAYS * 24 * 3600 * 1000;
  const allDone = steps.account && steps.transaction && steps.target;
  const dismissed = !!profile?.onboardingDismissedAt;

  return { visible: isNew && !dismissed && !allDone, steps };
}

export async function dismissOnboarding(userId: string): Promise<void> {
  await prisma.userProfile.upsert({
    where: { userId },
    update: { onboardingDismissedAt: new Date() },
    create: { userId, name: 'User', onboardingDismissedAt: new Date() },
  });
}
