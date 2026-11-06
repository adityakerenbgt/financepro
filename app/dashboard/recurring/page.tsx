'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pause, Play, Plus, Repeat, RefreshCw, Trash2, X } from 'lucide-react';
import { useToast } from '../../providers';
import { useAuth } from '../../auth-context';
import ProGate from '../../components/ProGate';
import { RpInput } from '../../components/RpInput';
import { useSetupData } from '../../hooks';
import { useLang, localeOf } from '@/app/i18n';
import { formatMoney as formatRp } from '@/lib/currency';

interface Schedule {
  id: string;
  type: 'Pemasukan' | 'Pengeluaran';
  amount: number;
  description: string;
  note: string | null;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string | null;
  nextRunAt: string;
  active: boolean;
  category: { id: string; name: string };
  account: { id: string; name: string };
}

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function RecurringPage() {
  const { plan, role } = useAuth();
  const { t, tError, lang } = useLang();
  const { toast } = useToast();
  const { categories, accounts } = useSetupData();
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isPro = role === 'ADMIN' || plan === 'PRO';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recurring');
      if (res.ok) setItems(await res.json());
    } catch { /* daftar gagal dimuat */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (isPro) load(); else setLoading(false); }, [isPro, load]);

  const call = async (method: 'PATCH' | 'DELETE', body: object, okMsg: string) => {
    try {
      const res = await fetch('/api/recurring', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan server');
      toast(okMsg, 'success');
      setConfirmDeleteId(null);
      load();
    } catch (e: any) {
      toast(tError(e.message), 'error');
    }
  };

  if (!isPro) return <ProGate feature={t('Transaksi Berulang', 'Recurring Transactions')} />;

  const freqLabel = (f: Schedule['frequency']) => ({
    DAILY: t('Setiap hari', 'Daily'), WEEKLY: t('Setiap minggu', 'Weekly'), MONTHLY: t('Setiap bulan', 'Monthly'), YEARLY: t('Setiap tahun', 'Yearly'),
  }[f]);
  const fmtDay = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const statusOf = (s: Schedule) => {
    if (s.active) return { text: `${t('Berikutnya', 'Next')}: ${fmtDay(s.nextRunAt)}`, tone: 'text-slate-400' };
    if (s.endDate && s.nextRunAt > s.endDate) return { text: t('Selesai', 'Completed'), tone: 'text-slate-500' };
    return { text: t('Dijeda', 'Paused'), tone: 'text-yellow-400' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('Transaksi Berulang', 'Recurring Transactions')}</h1>
          <p className="text-sm text-slate-400">{t('Gaji, cicilan, atau langganan dicatat otomatis sesuai jadwal.', 'Salary, installments or subscriptions are recorded automatically on schedule.')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> {t('Tambah', 'Add')}</button>
      </div>

      <p className="text-xs text-slate-500">
        {t('Transaksi dibuat otomatis setiap dini hari (WIB). Jadwal yang terlewat akan disusulkan; tanggal 29–31 pada bulan pendek dicatat di hari terakhir bulan itu.', 'Transactions are created automatically every early morning (WIB). Missed runs are caught up; the 29th–31st in short months fall on the last day of that month.')}
      </p>

      {loading ? (
        <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="card text-center py-10">
          <Repeat className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">{t('Belum ada transaksi berulang.', 'No recurring transactions yet.')}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(s => {
            const st = statusOf(s);
            return (
              <li key={s.id} className={`card ${s.active ? '' : 'opacity-70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate">{s.description}</h3>
                    <p className="text-xs text-slate-500">{s.account.name} · {s.category.name}</p>
                  </div>
                  <p className={`font-bold whitespace-nowrap ${s.type === 'Pemasukan' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {s.type === 'Pemasukan' ? '+' : '−'} {formatRp(s.amount)}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-300">{freqLabel(s.frequency)}{s.endDate ? ` · ${t('sampai', 'until')} ${fmtDay(s.endDate)}` : ''}</p>
                <p className={`text-xs mt-0.5 ${st.tone}`}>{st.text}</p>
                {s.note && <p className="text-xs text-slate-500 mt-1">{s.note}</p>}
                <div className="mt-3 flex items-center gap-2">
                  {(s.active || !(s.endDate && s.nextRunAt > s.endDate)) && (
                    <button
                      onClick={() => call('PATCH', { id: s.id, active: !s.active }, s.active ? t('Jadwal dijeda', 'Schedule paused') : t('Jadwal dilanjutkan', 'Schedule resumed'))}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {s.active ? <><Pause className="w-3.5 h-3.5" />{t('Jeda', 'Pause')}</> : <><Play className="w-3.5 h-3.5" />{t('Lanjutkan', 'Resume')}</>}
                    </button>
                  )}
                  {confirmDeleteId === s.id ? (
                    <span className="inline-flex items-center gap-2 text-xs">
                      <span className="text-slate-400">{t('Hapus jadwal? (transaksi lama tetap ada)', 'Delete schedule? (past transactions stay)')}</span>
                      <button onClick={() => call('DELETE', { id: s.id }, t('Jadwal dihapus', 'Schedule deleted'))} className="px-2 py-1 rounded bg-red-600 text-white">{t('Ya', 'Yes')}</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 rounded border border-slate-600 text-slate-300">{t('Batal', 'Cancel')}</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(s.id)} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40">
                      <Trash2 className="w-3.5 h-3.5" />{t('Hapus', 'Delete')}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <ScheduleForm
          categories={categories}
          accounts={accounts}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); toast(t('Jadwal dibuat', 'Schedule created'), 'success'); load(); }}
        />
      )}
    </div>
  );
}

function ScheduleForm({ categories, accounts, onClose, onSaved }: {
  categories: { id: string; name: string; type: string }[];
  accounts: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, tError } = useLang();
  const [form, setForm] = useState({
    type: 'Pengeluaran' as 'Pemasukan' | 'Pengeluaran', description: '', amount: '', categoryId: '', accountId: '',
    frequency: 'MONTHLY', startDate: todayLocal(), endDate: '', note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const typeCats = categories.filter(c => (form.type === 'Pemasukan' ? c.type === 'income' : c.type !== 'income'));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount), endDate: form.endDate || undefined, note: form.note || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(tError(data.error || 'Terjadi kesalahan server')); return; }
      onSaved();
    } catch {
      setError(t('Terjadi kesalahan. Coba lagi.', 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const field = 'input-field w-full text-sm';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">{t('Transaksi Berulang Baru', 'New Recurring Transaction')}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['Pengeluaran', 'Pemasukan'] as const).map(tp => (
            <button key={tp} type="button" onClick={() => setForm({ ...form, type: tp, categoryId: '' })}
              className={`py-2 rounded-lg text-sm border ${form.type === tp ? (tp === 'Pemasukan' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-red-500/15 text-red-300 border-red-500/40') : 'text-slate-400 border-slate-600'}`}>
              {tp === 'Pemasukan' ? t('Pemasukan', 'Income') : t('Pengeluaran', 'Expense')}
            </button>
          ))}
        </div>

        <div><label className="form-label">{t('Deskripsi', 'Description')}</label>
          <input className={field} value={form.description} maxLength={100} required onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('mis. Gaji bulanan, Kos, Netflix', 'e.g. Monthly salary, Rent, Netflix')} /></div>
        <div><label className="form-label">{t('Nominal', 'Amount')}</label>
          <RpInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder="1.000.000" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="form-label">{t('Kategori', 'Category')}</label>
            <select className={field} value={form.categoryId} required onChange={e => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">{t('Pilih', 'Select')}</option>
              {typeCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div><label className="form-label">{t('Rekening', 'Account')}</label>
            <select className={field} value={form.accountId} required onChange={e => setForm({ ...form, accountId: e.target.value })}>
              <option value="">{t('Pilih', 'Select')}</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select></div>
        </div>
        <div><label className="form-label">{t('Frekuensi', 'Frequency')}</label>
          <select className={field} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
            <option value="DAILY">{t('Setiap hari', 'Daily')}</option>
            <option value="WEEKLY">{t('Setiap minggu', 'Weekly')}</option>
            <option value="MONTHLY">{t('Setiap bulan', 'Monthly')}</option>
            <option value="YEARLY">{t('Setiap tahun', 'Yearly')}</option>
          </select></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="form-label">{t('Mulai', 'Start')}</label>
            <input type="date" className={field} value={form.startDate} required onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
          <div><label className="form-label">{t('Berakhir (opsional)', 'End (optional)')}</label>
            <input type="date" className={field} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
        </div>
        <div><label className="form-label">{t('Catatan (opsional)', 'Note (optional)')}</label>
          <input className={field} value={form.note} maxLength={300} onChange={e => setForm({ ...form, note: e.target.value })} /></div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>}
        <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? t('Menyimpan...', 'Saving...') : t('Simpan Jadwal', 'Save Schedule')}</button>
      </form>
    </div>
  );
}
