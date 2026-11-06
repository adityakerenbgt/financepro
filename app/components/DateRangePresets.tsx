'use client';

import { Lock } from 'lucide-react';
import { useLang } from '../i18n';
import { presetRange, type PresetKey } from '@/lib/dateRange';

const PRESETS: { key: PresetKey; id: string; en: string }[] = [
  { key: 'thisMonth', id: 'Bulan ini', en: 'This month' },
  { key: 'lastMonth', id: 'Bulan lalu', en: 'Last month' },
  { key: 'last7', id: '7 hari', en: '7 days' },
  { key: 'last30', id: '30 hari', en: '30 days' },
  { key: 'last3m', id: '3 bulan', en: '3 months' },
  { key: 'thisYear', id: 'Tahun ini', en: 'This year' },
  { key: 'all', id: 'Semua', en: 'All' },
];

// Tombol rentang tanggal cepat. Mengisi startDate & endDate; "Semua" mengosongkan keduanya.
// `lockedKeys`: preset yang tidak boleh dipakai (mis. paket FREE); mengkliknya memanggil onLockedClick.
export default function DateRangePresets({
  startDate, endDate, onChange, lockedKeys = [], onLockedClick,
}: {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  lockedKeys?: PresetKey[];
  onLockedClick?: () => void;
}) {
  const { t } = useLang();
  const today = new Date();

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Rentang tanggal cepat', 'Quick date ranges')}>
      {PRESETS.map(p => {
        const r = presetRange(p.key, today);
        const active = r.startDate === startDate && r.endDate === endDate;
        const locked = lockedKeys.includes(p.key);
        return (
          <button
            key={p.key}
            type="button"
            aria-pressed={active}
            title={locked ? t('Tersedia di paket PRO', 'Available on the PRO plan') : undefined}
            onClick={() => (locked ? onLockedClick?.() : onChange(r.startDate, r.endDate))}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-colors ${
              active
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : locked
                  ? 'text-slate-600 border-slate-800 cursor-not-allowed'
                  : 'text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
            }`}
          >
            {locked && <Lock className="w-3 h-3" />}
            {t(p.id, p.en)}
          </button>
        );
      })}
    </div>
  );
}
