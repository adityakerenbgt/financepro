'use client';

import { useMemo } from 'react';
import { Coins, RefreshCw } from 'lucide-react';
import { useCurrency } from '@/app/currency-context';
import { useLang } from '@/app/i18n';
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from '@/lib/currency';

// Pemilih mata uang tampilan + info kurs. `showInfo` menampilkan baris kurs & waktu pembaruan.
export default function CurrencySwitcher({ showInfo = true, className = '' }: { showInfo?: boolean; className?: string }) {
  const { currency, setCurrency, payload, rate, loading, error, refresh } = useCurrency();
  const { lang, t } = useLang();

  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames([lang === 'en' ? 'en' : 'id'], { type: 'currency' });
    } catch {
      return null;
    }
  }, [lang]);

  let info: string;
  if (currency === 'IDR') {
    info = t('Nilai dicatat dalam Rupiah. Pilih mata uang lain untuk melihat konversinya.', 'Values are recorded in Rupiah. Pick another currency to see the conversion.');
  } else if (rate) {
    const oneUnit = Math.round((1 / rate) * 100) / 100;
    const date = payload?.date ? new Date(payload.date + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    info = `1 ${currency} = Rp${oneUnit.toLocaleString('id-ID')}${date ? ` · ${t('data', 'data')} ${date}` : ''}. ${t('Kolom input tetap dalam Rupiah.', 'Input fields stay in Rupiah.')}`;
  } else if (error) {
    info = t('Kurs gagal dimuat, angka tampil dalam Rupiah.', 'Could not load rates; amounts shown in Rupiah.');
  } else {
    info = t('Memuat kurs…', 'Loading rates…');
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <select
          aria-label={t('Mata uang tampilan', 'Display currency')}
          value={currency}
          onChange={(e) => { if (isSupportedCurrency(e.target.value)) setCurrency(e.target.value); }}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs font-medium text-white focus:border-blue-500 focus:outline-none"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}{names ? ` — ${names.of(c) ?? ''}` : ''}
            </option>
          ))}
        </select>
        {currency !== 'IDR' && (
          <button
            type="button"
            onClick={() => refresh()}
            title={t('Perbarui kurs', 'Refresh rates')}
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      {showInfo && <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{info}</p>}
    </div>
  );
}
