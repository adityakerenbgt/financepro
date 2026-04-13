'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './auth-context';
import {
  BarChart3, ArrowRight, Wallet, TrendingUp, Target, CreditCard,
  PieChart, CalendarDays, Bot,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">FinancePro</span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary flex items-center gap-2"
          >
            Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
          <Bot className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-300">Telegram Bot + Web Dashboard</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent leading-tight mb-6">
          Kelola Keuangan<br />Pribadi dengan Mudah
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
          Catat transaksi, pantau investasi, kelola utang, atur budget, dan capai goals keuangan Anda —
          semua dalam satu platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary text-lg px-8 py-3 flex items-center gap-2 justify-center"
          >
            Buka Dashboard <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => router.push('/transactions')}
            className="btn-secondary text-lg px-8 py-3"
          >
            Kelola Transaksi
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Wallet, title: 'Transaksi', desc: 'Catat pemasukan & pengeluaran harian', color: 'blue' },
            { icon: TrendingUp, title: 'Investasi', desc: 'Pantau portofolio & return investasi', color: 'emerald' },
            { icon: CreditCard, title: 'Utang', desc: 'Monitor revolving & fixed debt', color: 'amber' },
            { icon: PieChart, title: 'Budget', desc: 'Atur budget per kategori per bulan', color: 'violet' },
            { icon: Target, title: 'Goals', desc: 'Target tabungan dengan deadline', color: 'rose' },
            { icon: CalendarDays, title: 'Laporan', desc: 'Harian, mingguan, bulanan', color: 'cyan' },
            { icon: BarChart3, title: 'Dashboard', desc: 'Visualisasi KPI & chart interaktif', color: 'indigo' },
            { icon: Bot, title: 'Telegram Bot', desc: 'Input transaksi via chat', color: 'green' },
          ].map((f, i) => (
            <div key={i} className="card-hover group">
              <div className={`w-10 h-10 rounded-lg bg-${f.color}-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className={`w-5 h-5 text-${f.color}-400`} />
              </div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        FinancePro &copy; {new Date().getFullYear()} — Personal Finance Manager
      </footer>
    </div>
  );
}
