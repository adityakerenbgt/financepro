'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpDown,
  PieChart, Lightbulb, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import type { DashboardData } from '@/types';
import { formatMoney as formatRp, formatCompactMoney } from '@/lib/currency';
import { useLang } from '@/app/i18n';
import { translateTip } from '@/lib/labels';
import OnboardingChecklist from '@/app/components/OnboardingChecklist';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

// ---- Custom Tooltip untuk semua chart ----
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950 border border-blue-500/40 rounded-xl px-4 py-3 shadow-2xl min-w-[160px]">
      {label && <p className="text-xs text-slate-400 mb-2 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color || p.fill || '#3b82f6' }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-semibold text-white">{typeof p.value === 'number' ? formatRp(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { t, lang } = useLang();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/dashboard-data?${params}`);
      const json = await res.json();
      setData(res.ok && json?.kpi ? json : null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-slate-400 py-20">{t('Gagal memuat data dashboard.', 'Failed to load dashboard data.')}</div>;
  }

  const { kpi, moneyFlow, spendingOverview, expensesSummary, investmentSummary, goalsProgress, tips } = data;

  return (
    <div className="space-y-6">
      {/* Header + Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">{t('Ringkasan keuangan Anda', 'Your financial summary')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field text-sm"
            placeholder={t('Dari', 'From')}
          />
          <span className="text-slate-500">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field text-sm"
            placeholder={t('Sampai', 'To')}
          />
          <button onClick={fetchData} className="btn-primary text-sm px-3 py-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <OnboardingChecklist />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard icon={TrendingUp} label={t('Total Pemasukan', 'Total Income')} value={formatRp(kpi.totalIncome)} color="emerald" />
        <KPICard icon={TrendingDown} label={t('Total Pengeluaran', 'Total Expenses')} value={formatRp(kpi.totalExpense)} color="red" />
        <KPICard icon={DollarSign} label={t('Total Tabungan', 'Total Savings')} value={formatRp(kpi.totalSavings)} color="blue" />
        <KPICard icon={CreditCard} label={t('Hutang Baru', 'New Debt')} value={formatRp(kpi.newDebt)} color="amber" />
        <KPICard icon={ArrowUpDown} label={t('Mutasi Rekening', 'Account Turnover')} value={formatRp(kpi.accountTurnover)} color="violet" />
        <KPICard icon={PieChart} label={t('Realisasi Budget', 'Budget Realisation')} value={`${kpi.budgetRealisation.toFixed(0)}%`} color="cyan" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Money Flow */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Money Flow</h3>
          {moneyFlow.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={moneyFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="period" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => formatCompactMoney(v, lang)} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                <Line type="monotone" dataKey="income" name={t('Pemasukan', 'Income')} stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" name={t('Pengeluaran', 'Expenses')} stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Spending Overview */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4">{t('Top 5 Pengeluaran', 'Top 5 Expenses')}</h3>
          {spendingOverview.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={spendingOverview} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => formatCompactMoney(v, lang)} />
                <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={11} width={100} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name={t('Jumlah', 'Amount')} radius={[0, 6, 6, 0]}>
                  {spendingOverview.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investment Summary */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4">{t('Alokasi Investasi', 'Investment Allocation')}</h3>
          {investmentSummary.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={investmentSummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="assetType" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => formatCompactMoney(v, lang)} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name={t('Nilai', 'Value')} fill="#8b5cf6" radius={[6, 6, 0, 0]}>
                  {investmentSummary.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Goals Progress */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4">{t('Progress Goals', 'Goals Progress')}</h3>
          {goalsProgress.length > 0 ? (
            <div className="space-y-4">
              {goalsProgress.map((g, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white font-medium">{g.name}</span>
                    <span className="text-slate-400">{formatRp(g.current)} / {formatRp(g.target)}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(g.progress, 100)}%`,
                        background: g.progress >= 100 ? '#10b981' : g.progress >= 50 ? '#3b82f6' : '#f59e0b',
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{g.progress.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Expenses Summary Table */}
      {expensesSummary.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-white mb-4">{t('Budget vs Realisasi', 'Budget vs Actual')}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700">
                <th className="pb-3 pr-4">{t('Kategori', 'Category')}</th>
                <th className="pb-3 pr-4 text-right">Budget</th>
                <th className="pb-3 pr-4 text-right">{t('Aktual', 'Actual')}</th>
                <th className="pb-3 pr-4 text-right">Progress</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {expensesSummary.map((item, i) => {
                const status = item.percentage > 100 ? 'Over' : item.percentage >= 80 ? 'Hampir' : 'Aman';
                return (
                  <tr key={i} className="border-b border-slate-700/50">
                    <td className="py-3 pr-4 text-white">{item.category}</td>
                    <td className="py-3 pr-4 text-right text-slate-300">{formatRp(item.budget)}</td>
                    <td className="py-3 pr-4 text-right text-white font-medium">{formatRp(item.actual)}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-20 bg-slate-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(item.percentage, 100)}%`,
                              background: item.percentage > 100 ? '#ef4444' : item.percentage >= 80 ? '#f59e0b' : '#10b981',
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-10 text-right">{item.percentage.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`${status === 'Over' ? 'badge-danger' : status === 'Hampir' ? 'badge-warning' : 'badge-success'}`}>
                        {status === 'Over' ? t('Over Budget', 'Over Budget') : status === 'Hampir' ? t('Hampir Over', 'Almost Over') : t('Aman', 'On Track')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <div className="card border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-amber-300">{t('Tips Keuangan', 'Financial Tips')}</h3>
          </div>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-slate-300">{translateTip(tip, lang)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/20 text-red-400',
    blue: 'bg-blue-500/20 text-blue-400',
    amber: 'bg-amber-500/20 text-amber-400',
    violet: 'bg-violet-500/20 text-violet-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <div className="kpi-card">
      <div className={`w-9 h-9 rounded-lg ${colorMap[color] || colorMap.blue} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function EmptyState() {
  const { t } = useLang();
  return (
    <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
      {t('Belum ada data', 'No data yet')}
    </div>
  );
}
