'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Eye, EyeOff, Check } from 'lucide-react';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function RegisterPage() {
  const router = useRouter();
  const { t, tError } = useLang();
  const [form, setForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tError(data.error || t('Pendaftaran gagal', 'Registration failed')));
        return;
      }
      setSuccess(true);
      setTimeout(() => { window.location.href = '/login'; }, 2000);
    } catch {
      setError(t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 8) return { label: t('Terlalu pendek', 'Too short'), color: 'text-red-400', bar: 'bg-red-500', width: 'w-1/4' };
    if (p.length < 12) return { label: t('Cukup', 'Fair'), color: 'text-yellow-400', bar: 'bg-yellow-500', width: 'w-2/4' };
    return { label: t('Kuat', 'Strong'), color: 'text-green-400', bar: 'bg-green-500', width: 'w-full' };
  };
  const strength = passwordStrength();

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white">{t('Akun berhasil dibuat!', 'Account created!')}</h2>
          <p className="text-slate-400">{t('Mengalihkan ke halaman login...', 'Redirecting to the login page...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute right-4 top-4"><LanguageSwitcher variant="app" /></div>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">FinancePro</span>
          </Link>
          <p className="text-slate-400 mt-2 text-sm">{t('Buat akun gratis — mulai kelola keuanganmu', 'Create a free account and start managing your money')}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
          <h1 className="text-lg font-bold text-white mb-5">{t('Daftar Akun', 'Sign Up')}</h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Username <span className="text-red-400">*</span></label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder={t('contoh: john_doe', 'e.g. john_doe')}
                required
                autoFocus
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">{t('Huruf, angka, underscore. Tidak bisa diubah.', 'Letters, numbers, underscores. Cannot be changed.')}</p>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">{t('Nama Lengkap', 'Full Name')}</label>
              <input
                name="displayName"
                value={form.displayName}
                onChange={handleChange}
                placeholder={t('Nama kamu', 'Your name')}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder={t('email@kamu.com (opsional)', 'you@email.com (optional)')}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder={t('Minimal 8 karakter', 'At least 8 characters')}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 pr-10 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {strength && (
                <div className="mt-2">
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.bar} ${strength.width}`} />
                  </div>
                  <p className={`text-xs mt-1 ${strength.color}`}>{strength.label}</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">{t('Konfirmasi Password', 'Confirm Password')} <span className="text-red-400">*</span></label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder={t('Ulangi password', 'Repeat password')}
                required
                className={`w-full bg-slate-700 border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none placeholder-slate-500
                  ${form.confirmPassword && form.confirmPassword !== form.password
                    ? 'border-red-500 focus:border-red-500'
                    : form.confirmPassword && form.confirmPassword === form.password
                    ? 'border-green-500 focus:border-green-500'
                    : 'border-slate-600 focus:border-blue-500'
                  }`}
              />
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <p className="text-xs text-red-400 mt-1">{t('Password tidak cocok', 'Passwords do not match')}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!!form.confirmPassword && form.password !== form.confirmPassword)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors mt-2"
            >
              {loading ? t('Membuat akun...', 'Creating account...') : t('Buat Akun Gratis', 'Create Free Account')}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-5">
            {t('Sudah punya akun?', 'Already have an account?')}{' '}
            <Link href="/login" className="text-blue-400 hover:underline font-medium">
              {t('Login', 'Log in')}
            </Link>
          </p>
        </div>

        {/* Free plan info */}
        <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-400">
          <p className="text-white font-medium mb-2">{t('Akun Free sudah termasuk:', 'The Free account includes:')}</p>
          <ul className="space-y-1">
            {[t('Catat transaksi (unlimited)', 'Unlimited transaction logging'), t('Dashboard keuangan', 'Finance dashboard'), t('Laporan bulanan', 'Monthly report'), t('Telegram bot', 'Telegram bot')].map(f => (
              <li key={f} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
