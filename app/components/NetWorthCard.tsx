'use client';

import Link from 'next/link';
import { Landmark, Lock } from 'lucide-react';
import { useLang } from '../i18n';
import { formatMoney } from '@/lib/currency';
import type { NetWorth } from '@/types';

// Kartu Net Worth di dashboard. `netWorth === null` = terkunci (paket FREE).
export default function NetWorthCard({ netWorth }: { netWorth: NetWorth | null }) {
  const { t } = useLang();

  if (netWorth === null) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-slate-700/50"><Lock className="w-5 h-5 text-slate-400" /></div>
          <div>
            <h3 className="font-semibold text-white">{t('Kekayaan Bersih (Net Worth)', 'Net Worth')}</h3>
            <p className="text-sm text-slate-400">{t('Gabungan rekening, aset, piutang, dan hutang. Tersedia di paket PRO.', 'Combines accounts, assets, receivables and debts. Available on the PRO plan.')}</p>
          </div>
        </div>
        <Link href="/dashboard/upgrade" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/30 transition-colors">
          {t('Upgrade ke PRO', 'Upgrade to PRO')}
        </Link>
      </div>
    );
  }

  const parts = [
    { label: t('Rekening & kas', 'Accounts & cash'), value: netWorth.cash, sign: '+', tone: 'text-slate-200' },
    { label: t('Aset', 'Assets'), value: netWorth.assets, sign: '+', tone: 'text-slate-200' },
    { label: t('Piutang', 'Receivables'), value: netWorth.receivables, sign: '+', tone: 'text-slate-200' },
    { label: t('Hutang', 'Debts'), value: netWorth.liabilities, sign: '−', tone: 'text-red-300' },
  ];

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10"><Landmark className="w-5 h-5 text-emerald-400" /></div>
          <div>
            <h3 className="font-semibold text-white">{t('Kekayaan Bersih (Net Worth)', 'Net Worth')}</h3>
            <p className="text-xs text-slate-500">{t('Per hari ini; tidak terpengaruh filter tanggal.', 'As of today; not affected by the date filter.')}</p>
          </div>
        </div>
        <p className={`text-3xl font-bold ${netWorth.netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`} data-testid="net-worth-value">
          {formatMoney(netWorth.netWorth)}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {parts.map(p => (
          <div key={p.label} className="rounded-lg bg-slate-900/40 border border-slate-700/60 px-3 py-2">
            <dt className="text-xs text-slate-400">{p.label}</dt>
            <dd className={`text-sm font-semibold ${p.tone}`}>{p.sign} {formatMoney(p.value)}</dd>
          </div>
        ))}
      </dl>

      {netWorth.excludedCardBalance !== 0 && (
        <p className="mt-3 text-xs text-slate-500">
          {t('Saldo rekening kartu kredit tidak dijumlahkan terpisah karena sudah tercermin di Hutang.', 'Credit card account balances are not added separately because they are already reflected in Debts.')}
        </p>
      )}
    </div>
  );
}
