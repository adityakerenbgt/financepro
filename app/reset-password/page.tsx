'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BarChart3, Check, Eye, EyeOff } from 'lucide-react';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

function ResetForm() {
  const { t, tError } = useLang();
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(tError(data.error || t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.')));
        return;
      }
      setDone(true);
      setTimeout(() => { window.location.href = '/login'; }, 2500);
    } catch {
      setError(t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-sm text-red-400">{t('Tautan tidak valid atau sudah kedaluwarsa', 'This link is invalid or has expired')}</p>
        <Link href="/forgot-password" className="text-blue-400 hover:underline text-sm font-medium">
          {t('Minta tautan baru', 'Request a new link')}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-7 h-7 text-green-400" />
        </div>
        <h1 className="text-lg font-bold text-white">{t('Password berhasil diubah', 'Password changed')}</h1>
        <p className="text-sm text-slate-400">{t('Mengalihkan ke halaman login...', 'Redirecting to the login page...')}</p>
      </div>
    );
  }

  const mismatch = !!confirmPassword && password !== confirmPassword;

  return (
    <>
      <h1 className="text-lg font-bold text-white mb-5">{t('Buat Password Baru', 'Choose a New Password')}</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
          <div className="mt-2">
            <Link href="/forgot-password" className="underline">{t('Minta tautan baru', 'Request a new link')}</Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">{t('Password baru', 'New password')}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              required
              autoFocus
              minLength={8}
              placeholder={t('Minimal 8 karakter', 'At least 8 characters')}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 pr-10 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              aria-label={showPassword ? t('Sembunyikan password', 'Hide password') : t('Tampilkan password', 'Show password')}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">{t('Konfirmasi password', 'Confirm password')}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
            required
            placeholder={t('Ulangi password', 'Repeat password')}
            className={`w-full bg-slate-700 border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none placeholder-slate-500 ${mismatch ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'}`}
          />
          {mismatch && <p className="text-xs text-red-400 mt-1">{t('Password tidak cocok', 'Passwords do not match')}</p>}
        </div>
        <button
          type="submit"
          disabled={loading || mismatch}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? t('Menyimpan...', 'Saving...') : t('Simpan Password Baru', 'Save New Password')}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
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
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
