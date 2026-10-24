'use client';

import { useAuth } from '@/app/auth-context';
import { Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useLang } from '@/app/i18n';
import { formatMoney } from '@/lib/currency';
import { PRICING } from '@/lib/plans';

interface ProGateProps {
  children?: React.ReactNode;
  feature?: string;
}

export default function ProGate({ children, feature }: ProGateProps) {
  const { plan, role, loading } = useAuth();
  const { t } = useLang();

  if (loading) return null;

  const isProUser = role === 'ADMIN' || plan === 'PRO';
  if (isProUser && children) return <>{children}</>;
  if (isProUser) return null;

  return (
    <div className="relative min-h-[60vh] flex flex-col">
      {/* Blurred preview */}
      {children && (
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-xl" aria-hidden>
          <div className="blur-sm opacity-30 scale-95 origin-top">
            {children}
          </div>
        </div>
      )}

      {/* Lock overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-xl">
          <div className="flex items-center justify-center w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-full mx-auto mb-4">
            <Lock className="w-8 h-8 text-yellow-400" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-semibold text-sm uppercase tracking-wide">{t('Fitur PRO', 'PRO Feature')}</span>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            {feature || t('Fitur ini', 'This feature')} {t('tersedia di PRO', 'is available on PRO')}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {t('Upgrade ke PRO untuk akses penuh semua fitur manajemen keuangan — laporan lengkap, tracking investasi, hutang, aset, goals, dan budget.', 'Upgrade to PRO for full access to every finance feature: complete reports, investment tracking, debts, assets, goals, and budgets.')}
          </p>

          <Link
            href="/dashboard/upgrade"
            className="block w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-yellow-500/20"
          >
            {t('Upgrade ke PRO', 'Upgrade to PRO')}
          </Link>

          <p className="text-slate-500 text-xs mt-3">
            {t('Mulai dari', 'From')} {formatMoney(PRICING.proMonthly)} {t('/ bulan', '/ month')}
          </p>
        </div>
      </div>
    </div>
  );
}
