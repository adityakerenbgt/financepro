'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, X, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '../../providers';
import type { DebtSummary } from '@/types';
import { RpInput } from '../../components/RpInput';
import { useAuth } from '../../auth-context';
import ProGate from '../../components/ProGate';
import { formatMoney as formatRp } from '@/lib/currency';
import { useLang } from '@/app/i18n';


interface DebtRow extends DebtSummary {}

export default function DebtsPage() {
  const { plan, role } = useAuth();
  const { t } = useLang();
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hutang' | 'piutang'>('hutang');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<DebtRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  const [paymentDebtName, setPaymentDebtName] = useState<string>('');
  const [paymentIsPiutang, setPaymentIsPiutang] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const { toast } = useToast();

  if (role !== 'ADMIN' && plan !== 'PRO') return <ProGate feature="Hutang & Piutang" />;

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const [debtsRes, accountsRes] = await Promise.all([
        fetch('/api/debts'),
        fetch('/api/accounts')
      ]);
      setDebts(await debtsRes.json());
      setAccounts(await accountsRes.json());
    }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const hutangList = debts.filter(d => !d.isPiutang);
  const piutangList = debts.filter(d => d.isPiutang);
  const shown = activeTab === 'hutang' ? hutangList : piutangList;

  const totalHutang = hutangList.reduce((s, d) => s + d.remainingDebt, 0);
  const totalPiutang = piutangList.reduce((s, d) => s + d.remainingDebt, 0);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/debts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(activeTab === 'hutang' ? t('Utang dihapus', 'Debt deleted') : t('Piutang dihapus', 'Receivable deleted'), 'success');
      setConfirmDeleteId(null);
      fetch_();
    } catch (err: any) { toast(err.message || t('Gagal menghapus', 'Failed to delete'), 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('Hutang & Piutang', 'Debts & Receivables')}</h1>
          <p className="text-sm text-slate-400">
            {activeTab === 'hutang'
              ? `${t('Sisa utang', 'Remaining debt')}: ${formatRp(totalHutang)}`
              : `${t('Piutang belum kembali', 'Outstanding receivables')}: ${formatRp(totalPiutang)}`}
          </p>
        </div>
        <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {activeTab === 'hutang' ? t('Tambah Hutang', 'Add Debt') : t('Tambah Piutang', 'Add Receivable')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden border border-slate-700 w-fit">
        {(['hutang', 'piutang'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-medium transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}>
            {tab === 'hutang' ? `${t('Hutang Saya', 'My Debts')} (${hutangList.length})` : `${t('Piutang ke Orang', 'Owed to Me')} (${piutangList.length})`}
          </button>
        ))}
      </div>


      {loading ? (
        <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>
      ) : shown.length === 0 ? (
        <div className="card text-center text-slate-500 py-10">
          {activeTab === 'hutang' ? t('Tidak ada data hutang.', 'No debt records.') : t('Tidak ada data piutang.', 'No receivable records.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shown.map(d => (
            <div key={d.id} className="card-hover">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{d.debtName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{d.isPiutang ? t('Piutang', 'Receivable') : d.debtType}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`${d.status === 'Lunas' ? 'badge-success' : d.status === 'Over Limit' ? 'badge-danger' : 'badge-warning'} mr-1`}>
                    {d.status === 'Lunas' ? t('Lunas', 'Paid Off') : d.status === 'Aktif' ? t('Aktif', 'Active') : d.status}
                  </span>
                  {confirmDeleteId === d.id ? (
                    <>
                      <button onClick={() => handleDelete(d.id)} className="text-red-400 text-xs font-medium px-2 py-1 bg-red-500/10 rounded">{t('Ya', 'Yes')}</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 text-xs px-2 py-1">{t('Tidak', 'No')}</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditData(d); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirmDeleteId(d.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">{d.isPiutang ? t('Dipinjamkan', 'Lent Out') : t('Limit/Pokok', 'Limit/Principal')}</p>
                  <p className="text-white font-medium">{formatRp(d.limitOrPrincipal)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">{d.isPiutang ? t('Belum Kembali', 'Outstanding') : t('Sisa Utang', 'Remaining Debt')}</p>
                  <p className={`font-medium ${d.isPiutang ? 'text-amber-400' : 'text-red-400'}`}>{formatRp(d.remainingDebt)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">{d.isPiutang ? t('Total Dipinjamkan', 'Total Lent') : t('Total Belanja', 'Total Spent')}</p>
                  <p className="text-white">{formatRp(d.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">{d.isPiutang ? t('Sudah Kembali', 'Repaid') : t('Total Bayar', 'Total Paid')}</p>
                  <p className="text-emerald-400">{formatRp(d.totalPaid)}</p>
                </div>
              </div>
              {d.remainingLimit !== undefined && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-400">{t('Sisa Limit', 'Remaining Limit')}: <span className="text-white">{formatRp(d.remainingLimit)}</span></p>
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-slate-700">
                <button
                  onClick={() => {
                    setPaymentDebtId(d.id);
                    setPaymentDebtName(d.debtName);
                    setPaymentIsPiutang(d.isPiutang ?? false);
                    setShowPaymentForm(true);
                  }}
                  className="btn-primary w-full text-xs py-2"
                >
                  {d.isPiutang ? t('Catat Penerimaan', 'Record Receipt') : t('Catat Pembayaran', 'Record Payment')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPaymentForm && paymentDebtId && (
        <PaymentForm
          debtId={paymentDebtId}
          debtName={paymentDebtName}
          isPiutang={paymentIsPiutang}
          accounts={accounts}
          onClose={() => { setShowPaymentForm(false); setPaymentDebtId(null); setPaymentDebtName(''); }}
          onSuccess={() => { setShowPaymentForm(false); setPaymentDebtId(null); setPaymentDebtName(''); fetch_(); }}
        />
      )}

      {showForm && (
        <DebtForm
          onClose={() => { setShowForm(false); setEditData(null); }}
          onSuccess={() => { setShowForm(false); setEditData(null); fetch_(); }}
          editData={editData}
          defaultIsPiutang={activeTab === 'piutang'}
        />
      )}
    </div>
  );
}

function DebtForm({ onClose, onSuccess, editData, defaultIsPiutang }: {
  onClose: () => void;
  onSuccess: () => void;
  editData?: DebtRow | null;
  defaultIsPiutang?: boolean;
}) {
  const { toast } = useToast();
  const { t } = useLang();
  const [form, setForm] = useState({
    debtType: editData?.debtType ?? 'Revolving',
    debtName: editData?.debtName ?? '',
    limitOrPrincipal: editData?.limitOrPrincipal?.toString() ?? '',
    interestRate: '',
    tenor: '',
    monthlyPayment: '',
    startDate: new Date().toISOString().split('T')[0],
    isPiutang: editData?.isPiutang ?? defaultIsPiutang ?? false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const method = editData ? 'PATCH' : 'POST';
      const body = editData ? { id: editData.id, ...form } : form;
      const res = await fetch('/api/debts', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(editData
        ? (form.isPiutang ? t('Piutang berhasil diupdate!', 'Receivable updated!') : t('Utang berhasil diupdate!', 'Debt updated!'))
        : (form.isPiutang ? t('Piutang berhasil ditambahkan!', 'Receivable added!') : t('Utang berhasil ditambahkan!', 'Debt added!')),
        'success');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || t('Gagal menyimpan', 'Failed to save'), 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{editData ? 'Edit' : t('Tambah', 'Add')} {form.isPiutang ? t('Piutang', 'Receivable') : t('Hutang', 'Debt')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hutang vs Piutang toggle */}
          <div>
            <label className="form-label">{t('Saya sebagai', 'I am the')}</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-600">
              {[{ value: false, label: t('Peminjam (Hutang)', 'Borrower (Debt)') }, { value: true, label: t('Pemberi Pinjaman (Piutang)', 'Lender (Receivable)') }].map(opt => (
                <button key={String(opt.value)} type="button"
                  onClick={() => setForm({ ...form, isPiutang: opt.value })}
                  disabled={!!editData}
                  className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                    form.isPiutang === opt.value
                      ? opt.value ? 'bg-amber-600 text-white' : 'bg-violet-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}>{opt.label}</button>
              ))}
            </div>
          </div>

          {!form.isPiutang && (
            <div>
              <label className="form-label">{t('Jenis Hutang', 'Debt Type')}</label>
              <div className="flex rounded-lg overflow-hidden border border-slate-600">
                {[{ value: 'Revolving', label: t('Revolving (CC/Paylater)', 'Revolving (Credit Card/Paylater)') }, { value: 'Fixed', label: t('Fixed (KPR/KKB/KUR)', 'Fixed (Mortgage/Auto/Business loan)') }].map(ty => (
                  <button key={ty.value} type="button" onClick={() => setForm({ ...form, debtType: ty.value })}
                    className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                      form.debtType === ty.value
                        ? ty.value === 'Revolving' ? 'bg-amber-600 text-white' : 'bg-violet-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                    }`}>{ty.label}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="form-label">{form.isPiutang ? t('Nama Peminjam / Keterangan', 'Borrower Name / Description') : t('Nama Hutang', 'Debt Name')}</label>
            <input type="text" value={form.debtName} onChange={e => setForm({ ...form, debtName: e.target.value })}
              className="input-field w-full text-sm"
              placeholder={form.isPiutang ? t('Budi, Proyek ABC...', 'John, Project ABC...') : t('BCA Card, Shopee Paylater...', 'Credit card, Paylater...')}
              required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">{form.isPiutang ? t('Jumlah Dipinjamkan', 'Amount Lent') : (form.debtType === 'Revolving' ? 'Limit' : t('Pokok Pinjaman', 'Loan Principal'))}</label>
              <RpInput value={form.limitOrPrincipal} onChange={v => setForm({ ...form, limitOrPrincipal: v })} required />
            </div>
            {!form.isPiutang && (
              <div>
                <label className="form-label">{t('Bunga (%/tahun)', 'Interest (%/year)')}</label>
                <input type="number" step="0.01" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} className="input-field w-full text-sm" placeholder="0" />
              </div>
            )}
          </div>

          {!form.isPiutang && form.debtType === 'Fixed' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">{t('Tenor (bulan)', 'Tenor (months)')}</label>
                <input type="number" value={form.tenor} onChange={e => setForm({ ...form, tenor: e.target.value })} className="input-field w-full text-sm" placeholder="12" />
              </div>
              <div>
                <label className="form-label">{t('Cicilan/bulan', 'Installment/month')}</label>
                <RpInput value={form.monthlyPayment} onChange={v => setForm({ ...form, monthlyPayment: v })} />
              </div>
            </div>
          )}

          <div>
            <label className="form-label">{t('Tanggal Mulai', 'Start Date')}</label>
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="input-field w-full text-sm" />
          </div>

          {form.isPiutang && form.debtName && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
              {t('Kategori', 'Category')} <strong>"{form.debtName}"</strong> {t('otomatis dibuat. Gunakan tombol', 'is created automatically. Use the')} <strong>"{t('Catat Penerimaan', 'Record Receipt')}"</strong> {t('di kartu piutang untuk mencatat pelunasan.', 'button on the receivable card to record repayments.')}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? t('Menyimpan...', 'Saving...') : editData ? t('Update', 'Update') : (form.isPiutang ? t('Simpan Piutang', 'Save Receivable') : t('Simpan Hutang', 'Save Debt'))}
          </button>
        </form>
      </div>
    </div>
  );
}

function PaymentForm({
  debtId,
  debtName,
  isPiutang,
  accounts,
  onClose,
  onSuccess,
}: {
  debtId: string;
  debtName: string;
  isPiutang: boolean;
  accounts: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { t } = useLang();
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    accountId: accounts.length > 0 ? accounts[0].id : '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.accountId) {
      setError(t('Jumlah dan rekening harus diisi', 'Amount and account are required'));
      return;
    }
    setError(''); setSubmitting(true);
    try {
      const res = await fetch('/api/debt-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtId,
          isPiutang,
          debtName,
          amount: parseFloat(form.amount),
          date: form.date,
          notes: form.notes,
          accountId: form.accountId,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(isPiutang ? t('Penerimaan tercatat', 'Receipt recorded') : t('Pembayaran tercatat', 'Payment recorded'), 'success');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || t('Gagal mencatat', 'Failed to record'), 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{isPiutang ? t('Catat Penerimaan', 'Record Receipt') : t('Catat Pembayaran', 'Record Payment')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">{isPiutang ? t('Dari', 'From') : t('Untuk', 'To')}: {debtName}</label>
            <p className="text-slate-400 text-xs">{isPiutang ? t('Penerimaan dari peminjam', 'Receipt from borrower') : t('Pembayaran utang', 'Debt payment')}</p>
          </div>

          <div>
            <label className="form-label">{t('Rekening', 'Account')}</label>
            <select
              value={form.accountId}
              onChange={e => setForm({ ...form, accountId: e.target.value })}
              className="input-field w-full text-sm"
              required
            >
              <option value="">{t('Pilih rekening...', 'Select an account...')}</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatRp(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">{t('Jumlah', 'Amount')}</label>
            <RpInput
              value={form.amount}
              onChange={v => setForm({ ...form, amount: v })}
              placeholder="0"
              required
            />
          </div>

          <div>
            <label className="form-label">{t('Tanggal', 'Date')}</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="input-field w-full text-sm"
              required
            />
          </div>

          <div>
            <label className="form-label">{t('Keterangan (opsional)', 'Description (optional)')}</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="input-field w-full text-sm"
              placeholder={t('Pembayaran cicilan, dll...', 'Installment payment, etc...')}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? t('Menyimpan...', 'Saving...') : t('Catat', 'Record')}
          </button>
        </form>
      </div>
    </div>
  );
}
