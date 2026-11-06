'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/app/auth-context';
import { useLang, localeOf } from '@/app/i18n';
import { formatRupiah } from '@/lib/plans';
import type { Analytics } from '@/lib/analytics';

function Metric({ label, value, hint, accent = 'text-white' }: { label: string; value: string; hint: string; accent?: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4" title={hint}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500 leading-snug">{hint}</p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { t, tError, lang } = useLang();
  const { role, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && role !== 'ADMIN') router.replace('/dashboard');
  }, [loading, role, router]);

  useEffect(() => {
    if (role !== 'ADMIN') return;
    fetch('/api/admin/analytics')
      .then(async r => {
        const j = await r.json().catch(() => ({}));
        if (r.ok) setData(j);
        else setError(tError(j.error || 'Terjadi kesalahan server'));
      })
      .catch(() => setError(t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.')));
  }, [role, t, tError]);

  if (loading || role !== 'ADMIN') return null;

  const pct = (n: number) => `${(n * 100).toLocaleString(localeOf(lang), { maximumFractionDigits: 1 })}%`;
  const num = (n: number) => n.toLocaleString(localeOf(lang));
  const chart = data?.weekly.map(w => ({
    ...w,
    label: new Date(`${w.weekStart}T00:00:00Z`).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('Analytics', 'Analytics')}</h1>
        <p className="text-sm text-slate-400">
          {t('Hanya akun user biasa yang dihitung; akun ADMIN tidak termasuk.', 'Only regular user accounts are counted; ADMIN accounts are excluded.')}
        </p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}
      {!data && !error && <p className="text-slate-500 text-sm">{t('Memuat...', 'Loading...')}</p>}

      {data && (
        <>
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">{t('Pengguna', 'Users')}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Metric label={t('Total user', 'Total users')} value={num(data.totalUsers)} hint={t('Semua akun role USER yang pernah terdaftar.', 'All USER-role accounts ever registered.')} />
              <Metric label={t('User baru 7 hari', 'New users (7d)')} value={num(data.newUsers7d)} hint={t('Akun yang dibuat dalam 7 hari terakhir.', 'Accounts created in the last 7 days.')} />
              <Metric label={t('User baru 30 hari', 'New users (30d)')} value={num(data.newUsers30d)} hint={t('Akun yang dibuat dalam 30 hari terakhir.', 'Accounts created in the last 30 days.')} />
              <Metric label={t('User aktif', 'Active users')} value={num(data.activeUsers30d)} hint={t('Pernah login dalam 30 hari terakhir (berdasarkan waktu login terakhir; sesi yang masih tersimpan tidak mengubahnya).', 'Logged in within the last 30 days (based on last login time; a still-valid session does not update it).')} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">{t('Paket', 'Plans')}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Metric label="FREE" value={num(data.plans.free)} hint={t('Plan efektif FREE, termasuk PRO yang masa aktifnya sudah lewat.', 'Effective FREE plan, including PRO users whose expiry has passed.')} />
              <Metric label="PRO" value={num(data.plans.pro)} accent="text-yellow-400" hint={t('PRO yang masih berlaku dan bukan trial (berbayar atau diatur manual oleh admin).', 'Active PRO that is not a trial (paid or set manually by an admin).')} />
              <Metric label="Trial" value={num(data.plans.trial)} accent="text-blue-400" hint={t('Trial gratis yang masih berjalan (belum membayar).', 'Free trials still running (not paid yet).')} />
              <Metric label={t('Pembayaran menunggu', 'Pending payments')} value={num(data.pendingPayments)} accent={data.pendingPayments > 0 ? 'text-yellow-400' : 'text-white'} hint={t('Permintaan pembayaran yang belum diproses admin.', 'Payment requests not yet processed by an admin.')} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">{t('Pendapatan', 'Revenue')}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Metric
                label={t('Konversi', 'Conversion')}
                value={pct(data.conversion.rate)}
                accent="text-green-400"
                hint={t(`User dengan minimal 1 pembayaran disetujui ÷ total user (${data.conversion.convertedUsers} dari ${data.totalUsers}).`, `Users with at least 1 approved payment ÷ total users (${data.conversion.convertedUsers} of ${data.totalUsers}).`)}
              />
              <Metric
                label="MRR"
                value={formatRupiah(data.mrr)}
                accent="text-green-400"
                hint={t('Pendapatan bulanan berulang: bulanan = nominal, tahunan = nominal ÷ 12, dari PRO berbayar yang masih aktif (pembayaran disetujui terakhir). Trial dan PRO manual tanpa pembayaran tidak dihitung.', 'Monthly recurring revenue: monthly = amount, yearly = amount ÷ 12, from active paid PRO users (latest approved payment). Trials and manual PRO without payment are excluded.')}
              />
              <Metric label={t('Pelanggan berbayar', 'Paying subscribers')} value={num(data.payingSubscribers)} hint={t('Jumlah user yang masuk hitungan MRR.', 'Number of users included in MRR.')} />
            </div>
          </section>

          <section className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white">{t('Pertumbuhan user per pekan', 'Weekly user growth')}</h2>
            <p className="text-xs text-slate-500 mb-3">
              {t('12 pekan terakhir (awal pekan = Senin, WIB). Batang = user baru; garis = total kumulatif.', 'Last 12 weeks (week starts Monday, WIB). Bars = new users; line = cumulative total.')}
            </p>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <ComposedChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e40af', borderRadius: 12 }} labelStyle={{ color: '#94a3b8' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                  <Bar dataKey="newUsers" name={t('User baru', 'New users')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="totalUsers" name={t('Total user', 'Total users')} stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <p className="text-xs text-slate-600">{t('Diperbarui', 'Updated')}: {new Date(data.generatedAt).toLocaleString(localeOf(lang))}</p>
        </>
      )}
    </div>
  );
}
