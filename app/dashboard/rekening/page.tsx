'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, X, Pencil, Trash2, Building2, Wallet, CreditCard, Smartphone } from 'lucide-react';
import { useToast } from '../../providers';
import { RpInput } from '../../components/RpInput';

function formatRp(n: number) {
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? '-' : '') + 'Rp' + abs.toLocaleString('id-ID');
}

const ACC_TYPES = [
  { value: 'bank',        label: 'Bank',        color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  { value: 'cash',        label: 'Tunai',       color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
  { value: 'ewallet',     label: 'E-Wallet',    color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { value: 'credit_card', label: 'Kartu Kredit',color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  { value: 'paylater',    label: 'Paylater',    color: 'text-red-400',    bg: 'bg-red-500/10' },
];

function typeLabel(t: string) { return ACC_TYPES.find(a => a.value === t)?.label || t; }
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
      toast('Saldo tidak boleh kosong', 'error');
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
      toast('Saldo diperbarui', 'success');
      setAdjustModalOpen(false);
      fetch_();
    } catch (err: any) { toast(err.message || 'Gagal update saldo', 'error'); }
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
      toast('Rekening dihapus', 'success');
      setConfirmDeleteId(null);
      setDeleteConfirmed(false);
      fetch_();
    } catch (err: any) { toast(err.message || 'Gagal menghapus', 'error'); }
  };

  const liquid = accounts.filter(a => ['bank', 'cash', 'ewallet'].includes(a.type) && !a.isDebt);
  const debtAccounts = accounts.filter(a => a.isDebt || ['credit_card', 'paylater'].includes(a.type));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Rekening</h1>
        <p className="text-sm text-slate-400">Saldo dan ringkasan per rekening</p>
      </div>

      {/* KPI bar */}
      {loading ? (
        <div className="flex justify-center py-6"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total Saldo</p>
              <p className={`text-xl font-bold ${totalAll >= 0 ? 'text-white' : 'text-red-400'}`}>{formatRp(totalAll)}</p>
              <p className="text-xs text-slate-500 mt-1">semua rekening liquid</p>
            </div>
            <div className="card">
              <p className="text-xs text-blue-400 uppercase tracking-wide mb-1">Bank</p>
              <p className="text-xl font-bold text-white">{formatRp(totalBank)}</p>
              <p className="text-xs text-slate-500 mt-1">{accounts.filter(a => a.type === 'bank').length} rekening</p>
            </div>
            <div className="card">
              <p className="text-xs text-emerald-400 uppercase tracking-wide mb-1">Tunai + E-Wallet</p>
              <p className="text-xl font-bold text-white">{formatRp(totalCash + totalEwallet)}</p>
              <p className="text-xs text-slate-500 mt-1">{accounts.filter(a => ['cash','ewallet'].includes(a.type)).length} rekening</p>
            </div>
            <div className="card">
              <p className="text-xs text-red-400 uppercase tracking-wide mb-1">Hutang CC / Paylater</p>
              <p className="text-xl font-bold text-red-400">{formatRp(totalDebt)}</p>
              <p className="text-xs text-slate-500 mt-1">{debtAccounts.length} rekening</p>
            </div>
          </div>

          {/* Liquid accounts */}
          <div className="card overflow-x-auto">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Rekening Liquid</h2>
            {liquid.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">Belum ada rekening. Tambah di Settings → Rekening & Sumber Dana</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300 border-b border-slate-700">
                    <th className="pb-3 pr-4 font-semibold">Rekening</th>
                    <th className="pb-3 pr-4 font-semibold">Tipe</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Pemasukan</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Pengeluaran</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Transfer</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Saldo</th>
                    <th className="pb-3 pr-4 font-semibold">Terakhir</th>
                    <th className="pb-3 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {liquid.map(acc => (
                    <tr key={acc.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="py-3 pr-4 text-white font-medium">{acc.name}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBg(acc.type)} ${typeColor(acc.type)}`}>
                          {typeLabel(acc.type)}
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
                        {acc.lastActivity ? new Date(acc.lastActivity).toLocaleDateString('id-ID') : '—'}
                      </td>
                      <td className="py-3 text-center">
                        {confirmDeleteId === acc.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <span className="text-xs text-slate-300 mr-1">Hapus?</span>
                            <button onClick={() => handleDelete(acc.id)} className="text-red-400 text-xs font-semibold px-2 py-1 bg-red-500/10 rounded">Ya</button>
                            <button onClick={() => { setConfirmDeleteId(null); setDeleteConfirmed(false); }} className="text-slate-300 text-xs px-2 py-1">Tidak</button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => openAdjustModal(acc.id, acc.balance)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors" title="Sesuaikan saldo">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirmDeleteId(acc.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Hapus rekening">
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
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Kartu Kredit & Paylater</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300 border-b border-slate-700">
                    <th className="pb-3 pr-4 font-semibold">Rekening</th>
                    <th className="pb-3 pr-4 font-semibold">Tipe</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Total Belanja</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Total Bayar</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Sisa Utang</th>
                    <th className="pb-3 pr-4 font-semibold">Terakhir</th>
                    <th className="pb-3 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {debtAccounts.map(acc => (
                    <tr key={acc.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="py-3 pr-4 text-white font-medium">{acc.name}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBg(acc.type)} ${typeColor(acc.type)}`}>{typeLabel(acc.type)}</span>
                      </td>
                      <td className="py-3 pr-4 text-right text-red-400">{formatRp(acc.totalExpense)}</td>
                      <td className="py-3 pr-4 text-right text-emerald-400">{formatRp(acc.totalIncome)}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-red-400">{formatRp(Math.max(0, acc.totalExpense - acc.totalIncome))}</td>
                      <td className="py-3 pr-4 text-slate-400 text-xs">
                        {acc.lastActivity ? new Date(acc.lastActivity).toLocaleDateString('id-ID') : '—'}
                      </td>
                      <td className="py-3 text-center">
                        {confirmDeleteId === acc.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <span className="text-xs text-slate-300 mr-1">Hapus?</span>
                            <button onClick={() => handleDelete(acc.id)} className="text-red-400 text-xs font-semibold px-2 py-1 bg-red-500/10 rounded">Ya</button>
                            <button onClick={() => { setConfirmDeleteId(null); setDeleteConfirmed(false); }} className="text-slate-300 text-xs px-2 py-1">Tidak</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(acc.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Hapus rekening">
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
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Sesuaikan Saldo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="form-label">Rekening</label>
            <p className="text-white font-medium">{accountName}</p>
          </div>
          <div>
            <label className="form-label">Saldo Baru</label>
            <RpInput value={form.newBalance} onChange={v => onFormChange({...form, newBalance: v})} placeholder="0" autoFocus />
          </div>
          <div>
            <label className="form-label">Catatan (opsional)</label>
            <textarea value={form.notes} onChange={e => onFormChange({...form, notes: e.target.value})}
              className="input-field w-full text-sm" placeholder="Koreksi saldo dari bank, dll..."
              rows={3} />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onSubmit} disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          </div>
        </div>
      </div>
    </div>
  );
}
