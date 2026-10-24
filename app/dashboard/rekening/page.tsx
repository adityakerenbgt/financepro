'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, X, Pencil, Trash2, Building2, Wallet, CreditCard, Smartphone } from 'lucide-react';
import { useToast } from '../../providers';
import { RpInput } from '../../components/RpInput';
import { formatMoney as formatRp } from '@/lib/currency';
import { useLang, localeOf } from '@/app/i18n';

const ACC_TYPES = [
  { value: 'bank',        label: 'Bank',        color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  { value: 'cash',        label: 'Tunai',       color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
  { value: 'ewallet',     label: 'E-Wallet',    color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { value: 'credit_card', label: 'Kartu Kredit',color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  { value: 'paylater',    label: 'Paylater',    color: 'text-red-400',    bg: 'bg-red-500/10' },
];

const ACC_TYPE_EN: Record<string, string> = { cash: 'Cash', credit_card: 'Credit Card' };
function typeLabel(t: string, lang: 'id' | 'en') {
  if (lang === 'en' && ACC_TYPE_EN[t]) return ACC_TYPE_EN[t];
  return ACC_TYPES.find(a => a.value === t)?.label || t;
}
function typeColor(t: string) { return ACC_TYPES.find(a => a.value === t)?.color || 'text-slate-400'; }
function typeBg(t: string)    { return ACC_TYPES.find(a => a.value === t)?.bg    || 'bg-slate-500/10'; }

interface AccountDetail {
  id: string;
  name: string;
  type: string;
  balance: number;
  isDebt: boolean;
  totalIncome: number;
  totalExpense: number;
  totalTransferOut: number;
  totalTransferIn: number;
  lastActivity: string | null;
  createdAt: string;
}

export default function RekeningPage() {
  const { t, lang } = useLang();
  const [accounts, setAccounts] = useState<AccountDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({ newBalance: '', notes: '' });
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const { toast } = useToast();

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts');
      setAccounts(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  // KPI aggregates
  const totalAll    = accounts.filter(a => !a.isDebt).reduce((s, a) => s + a.balance, 0);
  const totalBank   = accounts.filter(a => a.type === 'bank').reduce((s, a) => s + a.balance, 0);
  const totalCash   = accounts.filter(a => a.type === 'cash').reduce((s, a) => s + a.balance, 0);
  const totalEwallet= accounts.filter(a => a.type === 'ewallet').reduce((s, a) => s + a.balance, 0);
  const totalDebt   = accounts.filter(a => a.isDebt).reduce((s, a) => s + Math.abs(a.balance), 0);

  const openAdjustModal = (id: string, balance: number) => {
    setAdjustingId(id);
    setAdjustForm({ newBalance: String(Math.round(balance)), notes: '' });
    setAdjustModalOpen(true);
  };

  const handleAdjustBalance = async () => {
    if (!adjustingId || !adjustForm.newBalance) {
      toast(t('Saldo tidak boleh kosong', 'Balance cannot be empty'), 'error');
      return;
    }
    setAdjustSubmitting(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: adjustingId,
          balance: parseFloat(adjustForm.newBalance) || 0,
          notes: adjustForm.notes
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(t('Saldo diperbarui', 'Balance updated'), 'success');
      setAdjustModalOpen(false);
      fetch_();
    } catch (err: any) { toast(err.message || t('Gagal update saldo', 'Failed to update balance'), 'error'); }
    finally { setAdjustSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!deleteConfirmed) return;
    try {
      const res = await fetch('/api/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(t('Rekening dihapus', 'Account deleted'), 'success');
      setConfirmDeleteId(null);
      setDeleteConfirmed(false);
      fetch_();
    } catch (err: any) { toast(err.message || t('Gagal menghapus', 'Failed to delete'), 'error'); }
  };

  const liquid = accounts.filter(a => ['bank', 'cash', 'ewallet'].includes(a.type) && !a.isDebt);
  const debtAccounts = accounts.filter(a => a.isDebt || ['credit_card', 'paylater'].includes(a.type));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('Rekening', 'Accounts')}</h1>
        <p className="text-sm text-slate-400">{t('Saldo dan ringkasan per rekening', 'Balance and summary per account')}</p>
      </div>

      {/* KPI bar */}
      {loading ? (
        <div className="flex justify-center py-6"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{t('Total Saldo', 'Total Balance')}</p>
              <p className={`text-xl font-bold ${totalAll >= 0 ? 'text-white' : 'text-red-400'}`}>{formatRp(totalAll)}</p>
              <p className="text-xs text-slate-500 mt-1">{t('semua rekening liquid', 'all liquid accounts')}</p>
            </div>
            <div className="card">
              <p className="text-xs text-blue-400 uppercase tracking-wide mb-1">Bank</p>
              <p className="text-xl font-bold text-white">{formatRp(totalBank)}</p>
              <p className="text-xs text-slate-500 mt-1">{accounts.filter(a => a.type === 'bank').length} {t('rekening', 'accounts')}</p>
            </div>
            <div className="card">
              <p className="text-xs text-emerald-400 uppercase tracking-wide mb-1">{t('Tunai + E-Wallet', 'Cash + E-Wallet')}</p>
              <p className="text-xl font-bold text-white">{formatRp(totalCash + totalEwallet)}</p>
              <p className="text-xs text-slate-500 mt-1">{accounts.filter(a => ['cash','ewallet'].includes(a.type)).length} {t('rekening', 'accounts')}</p>
            </div>
            <div className="card">
              <p className="text-xs text-red-400 uppercase tracking-wide mb-1">{t('Hutang CC / Paylater', 'Credit Card / Paylater Debt')}</p>
              <p className="text-xl font-bold text-red-400">{formatRp(totalDebt)}</p>
              <p className="text-xs text-slate-500 mt-1">{debtAccounts.length} {t('rekening', 'accounts')}</p>
            </div>
          </div>

          {/* Liquid accounts */}
          <div className="card overflow-x-auto">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('Rekening Liquid', 'Liquid Accounts')}</h2>
            {liquid.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">{t('Belum ada rekening. Tambah di Settings → Rekening & Sumber Dana', 'No accounts yet. Add one in Settings → Accounts & Funding Sources')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300 border-b border-slate-700">
                    <th className="pb-3 pr-4 font-semibold">{t('Rekening', 'Account')}</th>
                    <th className="pb-3 pr-4 font-semibold">{t('Tipe', 'Type')}</th>
                    <th className="pb-3 pr-4 text-right font-semibold">{t('Pemasukan', 'Income')}</th>
                    <th className="pb-3 pr-4 text-right font-semibold">{t('Pengeluaran', 'Expenses')}</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Transfer</th>
                    <th className="pb-3 pr-4 text-right font-semibold">{t('Saldo', 'Balance')}</th>
                    <th className="pb-3 pr-4 font-semibold">{t('Terakhir', 'Last Activity')}</th>
                    <th className="pb-3 text-center font-semibold">{t('Aksi', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {liquid.map(acc => (
                    <tr key={acc.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="py-3 pr-4 text-white font-medium">{acc.name}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBg(acc.type)} ${typeColor(acc.type)}`}>
                          {typeLabel(acc.type, lang)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-emerald-400">{formatRp(acc.totalIncome)}</td>
                      <td className="py-3 pr-4 text-right text-red-400">{formatRp(acc.totalExpense)}</td>
                      <td className={`py-3 pr-4 text-right text-xs ${acc.totalTransferIn - acc.totalTransferOut >= 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                        {acc.totalTransferIn - acc.totalTransferOut !== 0 ? (acc.totalTransferIn - acc.totalTransferOut > 0 ? '+' : '') + formatRp(acc.totalTransferIn - acc.totalTransferOut) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <p className={`font-semibold ${acc.balance < 0 ? 'text-red-400' : 'text-white'}`}>{formatRp(acc.balance)}</p>
                      </td>
                      <td className="py-3 pr-4 text-slate-400 text-xs">
                        {acc.lastActivity ? new Date(acc.lastActivity).toLocaleDateString(localeOf(lang)) : '—'}
                      </td>
                      <td className="py-3 text-center">
                        {confirmDeleteId === acc.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <span className="text-xs text-slate-300 mr-1">{t('Hapus?', 'Delete?')}</span>
                            <button onClick={() => handleDelete(acc.id)} className="text-red-400 text-xs font-semibold px-2 py-1 bg-red-500/10 rounded">{t('Ya', 'Yes')}</button>
                            <button onClick={() => { setConfirmDeleteId(null); setDeleteConfirmed(false); }} className="text-slate-300 text-xs px-2 py-1">{t('Tidak', 'No')}</button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => openAdjustModal(acc.id, acc.balance)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors" title={t('Sesuaikan saldo', 'Adjust balance')}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirmDeleteId(acc.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title={t('Hapus rekening', 'Delete account')}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Debt accounts */}
          {debtAccounts.length > 0 && (
            <div className="card overflow-x-auto">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('Kartu Kredit & Paylater', 'Credit Cards & Paylater')}</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300 border-b border-slate-700">
                    <th className="pb-3 pr-4 font-semibold">{t('Rekening', 'Account')}</th>
                    <th className="pb-3 pr-4 font-semibold">{t('Tipe', 'Type')}</th>
                    <th className="pb-3 pr-4 text-right font-semibold">{t('Total Belanja', 'Total Spent')}</th>
                    <th className="pb-3 pr-4 text-right font-semibold">{t('Total Bayar', 'Total Paid')}</th>
                    <th className="pb-3 pr-4 text-right font-semibold">{t('Sisa Utang', 'Remaining Debt')}</th>
                    <th className="pb-3 pr-4 font-semibold">{t('Terakhir', 'Last Activity')}</th>
                    <th className="pb-3 text-center font-semibold">{t('Aksi', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {debtAccounts.map(acc => (
                    <tr key={acc.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="py-3 pr-4 text-white font-medium">{acc.name}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBg(acc.type)} ${typeColor(acc.type)}`}>{typeLabel(acc.type, lang)}</span>
                      </td>
                      <td className="py-3 pr-4 text-right text-red-400">{formatRp(acc.totalExpense)}</td>
                      <td className="py-3 pr-4 text-right text-emerald-400">{formatRp(acc.totalIncome)}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-red-400">{formatRp(Math.max(0, acc.totalExpense - acc.totalIncome))}</td>
                      <td className="py-3 pr-4 text-slate-400 text-xs">
                        {acc.lastActivity ? new Date(acc.lastActivity).toLocaleDateString(localeOf(lang)) : '—'}
                      </td>
                      <td className="py-3 text-center">
                        {confirmDeleteId === acc.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <span className="text-xs text-slate-300 mr-1">{t('Hapus?', 'Delete?')}</span>
                            <button onClick={() => handleDelete(acc.id)} className="text-red-400 text-xs font-semibold px-2 py-1 bg-red-500/10 rounded">{t('Ya', 'Yes')}</button>
                            <button onClick={() => { setConfirmDeleteId(null); setDeleteConfirmed(false); }} className="text-slate-300 text-xs px-2 py-1">{t('Tidak', 'No')}</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(acc.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title={t('Hapus rekening', 'Delete account')}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Adjust Balance Modal */}
      {adjustModalOpen && adjustingId && (
        <AdjustBalanceModal
          accountName={accounts.find(a => a.id === adjustingId)?.name || ''}
          form={adjustForm}
          onFormChange={setAdjustForm}
          onSubmit={handleAdjustBalance}
          onClose={() => setAdjustModalOpen(false)}
          submitting={adjustSubmitting}
        />
      )}
    </div>
  );
}

function AdjustBalanceModal({ accountName, form, onFormChange, onSubmit, onClose, submitting }: {
  accountName: string;
  form: { newBalance: string; notes: string };
  onFormChange: (f: any) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{t('Sesuaikan Saldo', 'Adjust Balance')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="form-label">{t('Rekening', 'Account')}</label>
            <p className="text-white font-medium">{accountName}</p>
          </div>
          <div>
            <label className="form-label">{t('Saldo Baru', 'New Balance')} <span className="text-slate-500 font-normal">({t('dalam Rupiah', 'in Rupiah')})</span></label>
            <RpInput value={form.newBalance} onChange={v => onFormChange({...form, newBalance: v})} placeholder="0" autoFocus />
          </div>
          <div>
            <label className="form-label">{t('Catatan (opsional)', 'Notes (optional)')}</label>
            <textarea value={form.notes} onChange={e => onFormChange({...form, notes: e.target.value})}
              className="input-field w-full text-sm" placeholder={t('Koreksi saldo dari bank, dll...', 'Balance correction from bank, etc...')}
              rows={3} />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onSubmit} disabled={submitting} className="btn-primary flex-1">
              {submitting ? t('Menyimpan...', 'Saving...') : t('Simpan', 'Save')}
            </button>
            <button onClick={onClose} className="btn-secondary flex-1">{t('Batal', 'Cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
