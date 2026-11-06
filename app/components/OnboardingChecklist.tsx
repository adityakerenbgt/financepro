'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Circle, X } from 'lucide-react';
import { useLang } from '../i18n';

interface Status {
  visible: boolean;
  steps: { account: boolean; transaction: boolean; target: boolean };
}

// Checklist langkah awal untuk user baru. Status dihitung server dari data nyata.
export default function OnboardingChecklist() {
  const { t } = useLang();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.steps) setStatus(d); })
      .catch(() => {});
  }, []);

  if (!status?.visible) return null;

  const items = [
    { done: status.steps.account, href: '/dashboard/rekening', label: t('Buat rekening pertama', 'Create your first account') },
    { done: status.steps.transaction, href: '/transactions', label: t('Catat transaksi pertama', 'Record your first transaction') },
    { done: status.steps.target, href: '/dashboard/settings', label: t('Atur target di Pengaturan', 'Set your targets in Settings') },
  ];
  const doneCount = items.filter(i => i.done).length;

  const dismiss = async () => {
    setStatus(s => (s ? { ...s, visible: false } : s));
    try {
      await fetch('/api/onboarding', { method: 'POST' });
    } catch {
      // abaikan; akan muncul lagi saat dimuat ulang
    }
  };

  return (
    <div className="card border-blue-500/30 bg-blue-500/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white">{t('Mulai dengan FinancePro', 'Get started with FinancePro')}</h3>
          <p className="text-sm text-slate-400">{t(`${doneCount} dari ${items.length} langkah selesai`, `${doneCount} of ${items.length} steps done`)}</p>
        </div>
        <button
          onClick={dismiss}
          title={t('Sembunyikan', 'Dismiss')}
          aria-label={t('Sembunyikan', 'Dismiss')}
          className="text-slate-500 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map(item => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-2.5 text-sm ${item.done ? 'text-slate-500 line-through' : 'text-slate-200 hover:text-white'}`}
            >
              {item.done
                ? <Check className="w-4 h-4 text-green-400 shrink-0" />
                : <Circle className="w-4 h-4 text-slate-500 shrink-0" />}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
