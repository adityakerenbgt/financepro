'use client';

import { useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { getISOWeek, getYear } from 'date-fns';
import { useAuth } from '../../auth-context';
import ProGate from '../../components/ProGate';
import { formatMoney as formatRp } from '@/lib/currency';
import { useLang, localeOf } from '@/app/i18n';


// Convert YYYY-MM (input type="month") → "Apr 2026"
function monthInputToDisplay(val: string): string {
  if (!val) return '';
  const [year, month] = val.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
}

// Tampilan bulan sesuai bahasa UI (nilai untuk API tetap monthInputToDisplay)
function monthLabel(val: string, lang: 'id' | 'en'): string {
  if (!val) return '';
  const [year, month] = val.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString(localeOf(lang), { month: 'short', year: 'numeric' });
}

// Tampilan minggu sesuai bahasa UI (nilai untuk API tetap "Minggu X YYYY")
function weekLabel(s: string, lang: 'id' | 'en'): string {
  return lang === 'en' ? s.replace('Minggu', 'Week') : s;
}

// Convert date string → "Minggu X YYYY" (format kunci untuk API)
function dateToWeekString(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const week = getISOWeek(d);
  const year = getYear(d);
  return `Minggu ${week} ${year}`;
}

export default function ReportsPage() {
  const { plan, role } = useAuth();
  const { t, lang } = useLang();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Daily
  const [dailyDate, setDailyDate] = useState('');

  // Weekly — store raw date inputs, display as "Minggu X YYYY"
  const [weekDate1, setWeekDate1] = useState('');
  const [weekDate2, setWeekDate2] = useState('');

  // Monthly — store as YYYY-MM for input, convert for API
  const [monthRaw, setMonthRaw] = useState('');

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setReport(null);
    setError('');
    try {
      let url = '/api/reports?';
      if (activeTab === 'daily') {
        if (!dailyDate) { setError(t('Pilih tanggal terlebih dahulu', 'Please select a date first')); setLoading(false); return; }
        url += `type=daily&date=${dailyDate}`;
      } else if (activeTab === 'weekly') {
        const w1 = dateToWeekString(weekDate1);
        const w2 = dateToWeekString(weekDate2);
        if (!w1 || !w2) { setError(t('Pilih dua tanggal untuk perbandingan', 'Select two dates to compare')); setLoading(false); return; }
        url += `type=weekly&thisWeek=${encodeURIComponent(w1)}&lastWeek=${encodeURIComponent(w2)}`;
      } else {
        const monthDisplay = monthInputToDisplay(monthRaw);
        if (!monthDisplay) { setError(t('Pilih bulan terlebih dahulu', 'Please select a month first')); setLoading(false); return; }
        url += `type=monthly&month=${encodeURIComponent(monthDisplay)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(t('Gagal mengambil laporan', 'Failed to fetch report'));
      setReport(await res.json());
    } catch (e: any) {
      setError(e.message || t('Terjadi kesalahan', 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  if (role !== 'ADMIN' && plan !== 'PRO') return <ProGate feature="Laporan Lengkap" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('Laporan', 'Reports')}</h1>

      {/* Tab selector */}
      <div className="flex gap-2">
        {(['daily', 'weekly', 'monthly'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setReport(null); setError(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            {tab === 'daily' ? `📅 ${t('Harian', 'Daily')}` : tab === 'weekly' ? `📆 ${t('Mingguan', 'Weekly')}` : `🗓️ ${t('Bulanan', 'Monthly')}`}
          </button>
        ))}
      </div>

      {/* Input panel */}
      <div className="card">
        {/* DAILY */}
        {activeTab === 'daily' && (
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">{t('Pilih Tanggal', 'Select Date')}</label>
              <input
                type="date"
                value={dailyDate}
                onChange={e => setDailyDate(e.target.value)}
                className="input-field text-sm"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <RunButton loading={loading} onClick={fetchReport} />
          </div>
        )}

        {/* WEEKLY */}
        {activeTab === 'weekly' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">{t('Pilih dua tanggal untuk dibandingkan minggu-nya.', 'Pick two dates to compare their weeks.')}</p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">{t('Minggu Pertama', 'First Week')}</label>
                <input
                  type="date"
                  value={weekDate1}
                  onChange={e => setWeekDate1(e.target.value)}
                  className="input-field text-sm"
                />
                {weekDate1 && (
                  <p className="text-xs text-blue-400 mt-1">{weekLabel(dateToWeekString(weekDate1), lang)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">{t('Minggu Kedua (Pembanding)', 'Second Week (Comparison)')}</label>
                <input
                  type="date"
                  value={weekDate2}
                  onChange={e => setWeekDate2(e.target.value)}
                  className="input-field text-sm"
                />
                {weekDate2 && (
                  <p className="text-xs text-blue-400 mt-1">{weekLabel(dateToWeekString(weekDate2), lang)}</p>
                )}
              </div>
              <RunButton loading={loading} onClick={fetchReport} />
            </div>
          </div>
        )}

        {/* MONTHLY */}
        {activeTab === 'monthly' && (
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">{t('Pilih Bulan', 'Select Month')}</label>
              <input
                type="month"
                value={monthRaw}
                onChange={e => setMonthRaw(e.target.value)}
                className="input-field text-sm"
                max={new Date().toISOString().slice(0, 7)}
              />
              {monthRaw && (
                <p className="text-xs text-blue-400 mt-1">{monthLabel(monthRaw, lang)}</p>
              )}
            </div>
            <RunButton loading={loading} onClick={fetchReport} />
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-10">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      )}

      {report && activeTab === 'daily'   && <DailyResult data={report} />}
      {report && activeTab === 'weekly'  && <WeeklyResult data={report} w1={weekLabel(dateToWeekString(weekDate1), lang)} w2={weekLabel(dateToWeekString(weekDate2), lang)} />}
      {report && activeTab === 'monthly' && <MonthlyResult data={report} month={monthLabel(monthRaw, lang)} />}
    </div>
  );
}

function RunButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  const { t } = useLang();
  return (
    <button onClick={onClick} disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
      {loading
        ? <RefreshCw className="w-4 h-4 animate-spin" />
        : <CalendarDays className="w-4 h-4" />}
      {t('Tampilkan', 'Show')}
    </button>
  );
}

/* ---- DAILY RESULT ---- */
function DailyResult({ data }: { data: any }) {
  const { t, lang } = useLang();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label={t('Pemasukan', 'Income')}    value={formatRp(data.totalIncome)}  color="emerald" />
        <Stat label={t('Pengeluaran', 'Expenses')}  value={formatRp(data.totalExpense)} color="red" />
        <Stat label={t('Saldo', 'Balance')}        value={formatRp(data.balance)}      color="blue" />
        <Stat label={t('Transaksi', 'Transactions')}    value={data.transactionCount}       color="violet" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Stat label={t('Rata-rata/transaksi', 'Average/transaction')} value={formatRp(data.averagePerTransaction)} color="cyan" />
        <Stat label={t('Kategori Terbesar', 'Largest Category')}   value={data.largestCategory}                 color="amber" />
        <Stat label={t('Kategori Terkecil', 'Smallest Category')}   value={data.smallestCategory}                color="slate" />
      </div>
      {data.transactions?.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-white mb-3">{t('Daftar Transaksi', 'Transaction List')}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700">
                <th className="pb-2 pr-3">{t('Kategori', 'Category')}</th>
                <th className="pb-2 pr-3">{t('Deskripsi', 'Description')}</th>
                <th className="pb-2 pr-3">{t('Rekening', 'Account')}</th>
                <th className="pb-2 pr-3">{t('Jenis', 'Type')}</th>
                <th className="pb-2 text-right">{t('Jumlah', 'Amount')}</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx: any, i: number) => (
                <tr key={i} className="border-b border-slate-700/50">
                  <td className="py-2 pr-3 text-white">{tx.category}</td>
                  <td className="py-2 pr-3 text-slate-300">{tx.description}</td>
                  <td className="py-2 pr-3 text-slate-400">{tx.account}</td>
                  <td className="py-2 pr-3">
                    <span className={tx.type === 'Pemasukan' ? 'badge-success' : 'badge-danger'}>{tx.type === 'Pemasukan' ? t('Pemasukan', 'Income') : tx.type === 'Pengeluaran' ? t('Pengeluaran', 'Expense') : tx.type}</span>
                  </td>
                  <td className={`py-2 text-right font-medium ${tx.type === 'Pemasukan' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatRp(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---- WEEKLY RESULT ---- */
function WeeklyResult({ data, w1, w2 }: { data: any; w1: string; w2: string }) {
  const { t } = useLang();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label={w1 || data.thisWeekLabel}  value={formatRp(data.totalThis)}   color="blue" />
        <Stat label={w2 || data.lastWeekLabel}  value={formatRp(data.totalLast)}   color="slate" />
        <Stat label={t('Selisih', 'Difference')}                   value={formatRp(data.difference)}  color={data.difference > 0 ? 'red' : 'emerald'} />
        <Stat label="Trend"                     value={data.trend}                 color="violet" />
      </div>
      {data.categories?.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-white mb-3">{t('Perbandingan per Kategori', 'Comparison by Category')}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700">
                <th className="pb-2 pr-3">{t('Kategori', 'Category')}</th>
                <th className="pb-2 pr-3 text-right">{w1}</th>
                <th className="pb-2 pr-3 text-right">{w2}</th>
                <th className="pb-2">{t('Perubahan', 'Change')}</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((c: any, i: number) => (
                <tr key={i} className="border-b border-slate-700/50">
                  <td className="py-2 pr-3 text-white">{c.category}</td>
                  <td className="py-2 pr-3 text-right text-white">{formatRp(c.thisWeek)}</td>
                  <td className="py-2 pr-3 text-right text-slate-400">{formatRp(c.lastWeek)}</td>
                  <td className={`py-2 text-sm font-medium ${
                    c.change > 0 ? 'text-red-400' : c.change < 0 ? 'text-emerald-400' : 'text-slate-400'
                  }`}>{c.changeLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---- MONTHLY RESULT ---- */
function MonthlyResult({ data, month }: { data: any; month: string }) {
  const { t } = useLang();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">{t('Laporan', 'Report')} {month}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label={t('Pemasukan', 'Income')}   value={formatRp(data.income)}     color="emerald" />
        <Stat label={t('Pengeluaran', 'Expenses')} value={formatRp(data.expense)}    color="red" />
        <Stat label={t('Tabungan', 'Savings')}    value={`${formatRp(data.savings)} (${data.savingsPercentage?.toFixed(1)}%)`} color="blue" />
        <Stat label={t('Investasi', 'Investment')}   value={formatRp(data.investment)} color="violet" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Stat label={t('Dana Goals', 'Goal Funds')}   value={formatRp(data.goalSavings)}  color="amber" />
        <Stat label={t('Bayar Utang', 'Debt Payments')}  value={formatRp(data.debtPayment)}  color="cyan" />
        <Stat label={t('Hutang Baru', 'New Debt')}  value={formatRp(data.newDebt)}      color="red" />
      </div>

      {data.categoryBreakdown?.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold text-white mb-3">{t('Breakdown Pengeluaran per Kategori', 'Expense Breakdown by Category')}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700">
                <th className="pb-2 pr-3">{t('Kategori', 'Category')}</th>
                <th className="pb-2 pr-3 text-right">Budget</th>
                <th className="pb-2 pr-3 text-right">{t('Aktual', 'Actual')}</th>
                <th className="pb-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {data.categoryBreakdown.map((c: any, i: number) => (
                <tr key={i} className="border-b border-slate-700/50">
                  <td className="py-2 pr-3 text-white">{c.category}</td>
                  <td className="py-2 pr-3 text-right text-slate-400">
                    {c.budget > 0 ? formatRp(c.budget) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-right text-white font-medium">{formatRp(c.actual)}</td>
                  <td className={`py-2 text-right font-medium ${
                    c.percentage > 100 ? 'text-red-400' : c.percentage > 80 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {c.percentage > 0 ? `${c.percentage.toFixed(0)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---- SHARED COMPONENTS ---- */
function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400', red: 'text-red-400', blue: 'text-blue-400',
    violet: 'text-violet-400', cyan: 'text-cyan-400', amber: 'text-amber-400',
    slate: 'text-slate-300',
  };
  return (
    <div className="card">
      <p className="text-xs text-slate-400 mb-1 leading-tight">{label}</p>
      <p className={`text-base font-bold ${colorMap[color] || 'text-white'} leading-tight`}>{value}</p>
    </div>
  );
}
