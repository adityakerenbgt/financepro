'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-context';
import { useToast } from '../providers';
import { Lock } from 'lucide-react';
import { useLang } from '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t, tError } = useLang();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      toast(t('Login berhasil! Selamat datang 🎉', 'Login successful! Welcome 🎉'), 'success');
      // Full page redirect ensures cookie is included in next request
      window.location.href = '/dashboard';
    } catch (err: any) {
      const msg = tError(err.message || t('Login gagal', 'Login failed'));
      setError(msg);
      toast(msg, 'error');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute right-4 top-4"><LanguageSwitcher variant="app" /></div>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">FinancePro</h1>
          <p className="text-slate-400">{t('Kelola keuangan pribadi dengan mudah', 'Manage your personal finances with ease')}</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl border border-slate-700 p-8 space-y-6 shadow-2xl">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder={t('Masukkan username', 'Enter your username')}
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder={t('Masukkan password', 'Enter your password')}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-105 active:scale-95"
          >
            {loading ? t('Sedang login...', 'Signing in...') : t('Login', 'Log in')}
          </button>

          <p className="text-center text-sm">
            <a href="/forgot-password" className="text-slate-400 hover:text-blue-400 hover:underline">
              {t('Lupa password?', 'Forgot password?')}
            </a>
          </p>

          <p className="text-center text-slate-400 text-sm">
            {t('Belum punya akun?', 'No account yet?')}{' '}
            <a href="/register" className="text-blue-400 hover:underline font-medium">
              {t('Daftar gratis', 'Sign up free')}
            </a>
          </p>
        </form>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          FinancePro © {new Date().getFullYear()} • Personal Finance Manager
        </p>
      </div>
    </div>
  );
}
