'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, MailCheck } from 'lucide-react';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function ForgotPasswordPage() {
  const { t, tError } = useLang();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(tError(data.error || t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.')));
        return;
      }
      setSent(true);
    } catch {
      setError(t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

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
          {sent ? (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto">
                <MailCheck className="w-7 h-7 text-green-400" />
              </div>
              <h1 className="text-lg font-bold text-white">{t('Periksa email kamu', 'Check your email')}</h1>
              <p className="text-sm text-slate-400">
                {t(
                  'Jika email terdaftar, kami telah mengirim tautan untuk mengatur ulang password. Tautan berlaku 1 jam.',
                  'If the email is registered, we have sent a link to reset your password. The link is valid for 1 hour.',
                )}
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold text-white mb-1">{t('Lupa Password', 'Forgot Password')}</h1>
              <p className="text-sm text-slate-400 mb-5">
                {t('Masukkan email akunmu. Kami akan mengirim tautan untuk membuat password baru.', 'Enter your account email. We will send you a link to choose a new password.')}
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    required
                    autoFocus
                    placeholder="email@kamu.com"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? t('Mengirim...', 'Sending...') : t('Kirim Tautan Reset', 'Send Reset Link')}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-slate-400 text-sm mt-5">
            <Link href="/login" className="text-blue-400 hover:underline font-medium">{t('Kembali ke login', 'Back to login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
