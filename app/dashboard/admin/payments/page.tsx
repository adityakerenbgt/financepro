'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, ExternalLink, XCircle } from 'lucide-react';
import { useAuth } from '@/app/auth-context';
import { useLang, localeOf } from '@/app/i18n';
import { formatRupiah, type PaymentPlanKey } from '@/lib/plans';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Item {
  id: string;
  plan: PaymentPlanKey;
  amount: number;
  status: Status;
  userNote: string | null;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: { id: string; username: string; displayName: string | null; email: string | null; plan: 'FREE' | 'PRO'; planExpiresAt: string | null };
}

const TABS: { key: Status | 'ALL'; id: string; en: string }[] = [
  { key: 'PENDING', id: 'Menunggu', en: 'Pending' },
  { key: 'APPROVED', id: 'Disetujui', en: 'Approved' },
  { key: 'REJECTED', id: 'Ditolak', en: 'Rejected' },
  { key: 'ALL', id: 'Semua', en: 'All' },
];

export default function AdminPaymentsPage() {
  const { t, tError, lang } = useLang();
  const { role, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Status | 'ALL'>('PENDING');
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    if (!loading && role !== 'ADMIN') router.replace('/dashboard');
  }, [loading, role, router]);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/admin/payments?status=${tab}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setItems(data.items); setCounts(data.counts); setError(''); }
      else setError(tError(data.error || 'Terjadi kesalahan server'));
    } catch {
      setError(t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.'));
    } finally {
      setFetching(false);
    }
  }, [tab, t, tError]);
  useEffect(() => { if (role === 'ADMIN') load(); }, [role, load]);

  const review = async (id: string, action: 'approve' | 'reject', adminNote?: string) => {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, adminNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(tError(data.error || 'Terjadi kesalahan server'));
      else {
        setRejectId(null);
        setRejectNote('');
        const st = data.emailStatus as string | undefined;
        setNotice(
          st === 'sent' ? t('Email notifikasi terkirim ke user.', 'Notification email sent to the user.')
          : st === 'skipped' ? t('Tersimpan. Email tidak dikirim karena layanan email belum dikonfigurasi.', 'Saved. No email was sent because the email service is not configured.')
          : st === 'no_email' ? t('Tersimpan. User tidak punya email, jadi tidak ada notifikasi.', 'Saved. The user has no email, so no notification was sent.')
          : t('Tersimpan, tetapi email notifikasi gagal dikirim.', 'Saved, but the notification email failed to send.'),
        );
      }
      await load();
    } catch {
      setError(t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const viewProof = async (id: string) => {
    setError('');
    try {
      const res = await fetch(`/api/admin/payments/${id}/proof`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(tError(data.error || 'Terjadi kesalahan server')); return; }
      window.open(data.url, '_blank', 'noopener,noreferrer'); // URL berlaku 60 detik
    } catch {
      setError(t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.'));
    }
  };

  const fmtDate = (s: string) => new Date(s).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', year: 'numeric' });
  const planLabel = (p: PaymentPlanKey) => (p === 'PRO_YEARLY' ? t('PRO Tahunan', 'PRO Yearly') : t('PRO Bulanan', 'PRO Monthly'));
  const badge = (s: Status) =>
    s === 'APPROVED' ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400"><CheckCircle2 className="w-3.5 h-3.5" />{t('Disetujui', 'Approved')}</span>
    : s === 'REJECTED' ? <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400"><XCircle className="w-3.5 h-3.5" />{t('Ditolak', 'Rejected')}</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-400"><Clock className="w-3.5 h-3.5" />{t('Menunggu', 'Pending')}</span>;

  if (loading || role !== 'ADMIN') return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('Permintaan Pembayaran', 'Payment Requests')}</h1>
        <p className="text-sm text-slate-400">{t('Periksa bukti transfer, lalu setujui atau tolak.', 'Check the proof of transfer, then approve or reject.')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(x => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${tab === x.key ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : 'text-slate-400 border-slate-700 hover:text-white'}`}
          >
            {t(x.id, x.en)}{x.key !== 'ALL' && <span className="ml-1.5 text-xs opacity-70">{counts[x.key]}</span>}
          </button>
        ))}
      </div>

      {notice && <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm px-4 py-3 rounded-lg">{notice}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {fetching && items.length === 0 ? (
        <p className="text-slate-500 text-sm">{t('Memuat...', 'Loading...')}</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500 text-sm">{t('Tidak ada permintaan.', 'No requests.')}</p>
      ) : (
        <ul className="space-y-3">
          {items.map(i => (
            <li key={i.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white font-semibold">{i.user.displayName || i.user.username} <span className="text-slate-500 font-normal">@{i.user.username}</span></p>
                  <p className="text-xs text-slate-500">{i.user.email ?? '-'}</p>
                  <p className="mt-1 text-sm text-slate-200">{planLabel(i.plan)} · {formatRupiah(i.amount)}</p>
                  <p className="text-xs text-slate-500">
                    {fmtDate(i.createdAt)} · {t('Plan saat ini', 'Current plan')}: {i.user.plan}
                    {i.user.planExpiresAt && ` ${t('s/d', 'until')} ${fmtDate(i.user.planExpiresAt)}`}
                  </p>
                </div>
                {badge(i.status)}
              </div>

              {i.userNote && <p className="mt-2 text-sm text-slate-300">{t('Catatan user', 'User note')}: {i.userNote}</p>}
              {i.status === 'REJECTED' && i.adminNote && <p className="mt-1 text-sm text-red-300">{t('Alasan', 'Reason')}: {i.adminNote}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={() => viewProof(i.id)} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700">
                  <ExternalLink className="w-3.5 h-3.5" />{t('Lihat bukti', 'View proof')}
                </button>
                {i.status === 'PENDING' && (
                  <>
                    <button
                      disabled={busyId === i.id}
                      onClick={() => review(i.id, 'approve')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-300 border border-green-500/40 hover:bg-green-500/25 disabled:opacity-50"
                    >
                      {t('Setujui', 'Approve')}
                    </button>
                    <button
                      disabled={busyId === i.id}
                      onClick={() => { setRejectId(rejectId === i.id ? null : i.id); setRejectNote(''); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25 disabled:opacity-50"
                    >
                      {t('Tolak', 'Reject')}
                    </button>
                  </>
                )}
              </div>

              {rejectId === i.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder={t('Alasan penolakan (wajib)', 'Reason for rejection (required)')}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
                  />
                  <button
                    disabled={busyId === i.id || !rejectNote.trim()}
                    onClick={() => review(i.id, 'reject', rejectNote)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('Kirim penolakan', 'Confirm rejection')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
