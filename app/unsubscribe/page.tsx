'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BarChart3, MailX } from 'lucide-react';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

function UnsubscribeForm() {
  const { t, tError } = useLang();
  const params = useSearchParams();
  const u = params.get('u') || '';
  const token = params.get('t') || '';
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/digest/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ u, t: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(tError(data.error || 'Terjadi kesalahan server')); return; }
      setDone(true);
    } catch {
      setError(t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (!u || !token) {
    return <p className="text-sm text-red-400 text-center">{t('Tautan tidak valid', 'Invalid link')}</p>;
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto">
          <MailX className="w-7 h-7 text-green-400" />
        </div>
        <h1 className="text-lg font-bold text-white">{t('Kamu sudah berhenti berlangganan', 'You have been unsubscribed')}</h1>
        <p className="text-sm text-slate-400">
          {t('Kamu tidak akan menerima ringkasan mingguan lagi. Bisa diaktifkan kembali kapan saja di Pengaturan.', 'You will no longer receive the weekly summary. You can turn it back on any time in Settings.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-lg font-bold text-white">{t('Berhenti berlangganan ringkasan mingguan?', 'Unsubscribe from the weekly summary?')}</h1>
      <p className="text-sm text-slate-400">{t('Kamu tidak akan menerima email ringkasan keuangan mingguan lagi.', 'You will stop receiving the weekly finance summary email.')}</p>
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}
      <button
        onClick={confirm}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {loading ? t('Memproses...', 'Processing...') : t('Ya, berhenti berlangganan', 'Yes, unsubscribe')}
      </button>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute right-4 top-4"><LanguageSwitcher variant="app" /></div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl"><BarChart3 className="w-6 h-6 text-white" /></div>
            <span className="text-2xl font-bold text-white">FinancePro</span>
          </Link>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
          <Suspense fallback={null}>
            <UnsubscribeForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
