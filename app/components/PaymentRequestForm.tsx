'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Upload, XCircle } from 'lucide-react';
import { useLang, localeOf } from '../i18n';
import { PAYMENT_PLANS, formatRupiah, type PaymentPlanKey } from '@/lib/plans';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

interface PaymentItem {
  id: string;
  plan: PaymentPlanKey;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  userNote: string | null;
  adminNote: string | null;
  createdAt: string;
}

// Pengajuan pembayaran PRO: unggah bukti transfer langsung ke storage privat, lalu kirim permintaan.
export default function PaymentRequestForm() {
  const { t, tError, lang } = useLang();
  const [plan, setPlan] = useState<PaymentPlanKey>('PRO_MONTHLY');
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/payments');
      if (res.ok) setItems(await res.json());
    } catch {
      // riwayat gagal dimuat: form tetap bisa dipakai
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const hasPending = items.some(i => i.status === 'PENDING');

  const onPickFile = (f: File | null) => {
    setError('');
    setSuccess(false);
    if (f && !ALLOWED.includes(f.type)) {
      setFile(null);
      setError(t('Jenis file tidak didukung (gunakan JPG, PNG, WEBP, atau PDF)', 'Unsupported file type (use JPG, PNG, WEBP, or PDF)'));
      return;
    }
    if (f && f.size > MAX_BYTES) {
      setFile(null);
      setError(t('Ukuran file maksimal 2 MB', 'Maximum file size is 2 MB'));
      return;
    }
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setSuccess(false);
    setSubmitting(true);
    try {
      // 1) minta URL unggah bertanda tangan (server memvalidasi jenis & ukuran)
      const up = await fetch('/api/payments/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) { setError(tError(upData.error || t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.'))); return; }

      // 2) unggah langsung ke Supabase Storage (format sama dengan storage-js: file di field kosong)
      const form = new FormData();
      form.append('cacheControl', '3600');
      form.append('', file);
      const put = await fetch(upData.signedUrl, { method: 'PUT', headers: { 'x-upsert': 'false' }, body: form });
      if (!put.ok) { setError(t('Gagal mengunggah bukti. Coba lagi.', 'Failed to upload the proof. Please try again.')); return; }

      // 3) buat permintaan pembayaran (nominal dihitung server)
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, proofPath: upData.path, userNote: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(tError(data.error || t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.'))); return; }

      setSuccess(true);
      setFile(null);
      setNote('');
      await load();
    } catch {
      setError(t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const planLabel = (p: PaymentPlanKey) => (p === 'PRO_YEARLY' ? t('PRO Tahunan', 'PRO Yearly') : t('PRO Bulanan', 'PRO Monthly'));
  const statusBadge = (s: PaymentItem['status']) => {
    if (s === 'APPROVED') return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400"><CheckCircle2 className="w-3.5 h-3.5" />{t('Disetujui', 'Approved')}</span>;
    if (s === 'REJECTED') return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400"><XCircle className="w-3.5 h-3.5" />{t('Ditolak', 'Rejected')}</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-400"><Clock className="w-3.5 h-3.5" />{t('Menunggu konfirmasi', 'Awaiting confirmation')}</span>;
  };

  return (
    <section id="bayar" className="bg-slate-800 border border-slate-700 rounded-2xl p-6 scroll-mt-20">
      <h2 className="text-lg font-bold text-white mb-1">{t('Ajukan Pembayaran', 'Submit Payment')}</h2>
      <p className="text-sm text-slate-400 mb-5">
        {t('Setelah transfer, unggah bukti pembayaran. Admin akan mengonfirmasi dan mengaktifkan PRO.', 'After transferring, upload the proof of payment. An admin will confirm and activate PRO.')}
      </p>

      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg">
          {t('Permintaan terkirim. Kami akan mengonfirmasi secepatnya.', 'Request sent. We will confirm it shortly.')}
        </div>
      )}

      {hasPending ? (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          {t('Kamu punya permintaan yang sedang menunggu konfirmasi. Pengajuan baru bisa dibuat setelah diproses.', 'You have a request awaiting confirmation. You can submit a new one after it is processed.')}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {(Object.keys(PAYMENT_PLANS) as PaymentPlanKey[]).map(p => (
              <label
                key={p}
                className={`cursor-pointer rounded-xl border p-4 transition-colors ${plan === p ? 'border-yellow-500/60 bg-yellow-500/10' : 'border-slate-600 hover:border-slate-500'}`}
              >
                <input type="radio" name="plan" value={p} checked={plan === p} onChange={() => setPlan(p)} className="sr-only" />
                <p className="font-semibold text-white">{planLabel(p)}</p>
                <p className="text-sm text-slate-300">
                  {formatRupiah(PAYMENT_PLANS[p].amount)}{' '}
                  <span className="text-slate-500">{p === 'PRO_YEARLY' ? t('/ tahun', '/ year') : t('/ bulan', '/ month')}</span>
                </p>
              </label>
            ))}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">{t('Bukti transfer (JPG, PNG, WEBP, atau PDF, maks. 2 MB)', 'Proof of transfer (JPG, PNG, WEBP, or PDF, max 2 MB)')}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={e => onPickFile(e.target.files?.[0] ?? null)}
              required
              className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-slate-600"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">{t('Catatan (opsional)', 'Note (optional)')}</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
              placeholder={t('Mis. nama pengirim atau waktu transfer', 'E.g. sender name or transfer time')}
            />
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <button
            type="submit"
            disabled={submitting || !file}
            className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all"
          >
            <Upload className="w-4 h-4" />
            {submitting ? t('Mengirim...', 'Sending...') : t('Kirim Permintaan', 'Send Request')}
          </button>
        </form>
      )}

      {items.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-white mb-2">{t('Riwayat pengajuan', 'Request history')}</h3>
          <ul className="divide-y divide-slate-700 rounded-xl border border-slate-700">
            {items.map(i => (
              <li key={i.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-white font-medium">{planLabel(i.plan)} · {formatRupiah(i.amount)}</p>
                    <p className="text-xs text-slate-500">{new Date(i.createdAt).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {statusBadge(i.status)}
                </div>
                {i.status === 'REJECTED' && i.adminNote && (
                  <p className="mt-1 text-xs text-red-300">{t('Alasan', 'Reason')}: {i.adminNote}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
