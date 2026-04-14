'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, X, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '../../providers';
import { useAuth } from '../../auth-context';
import ProGate from '../../components/ProGate';
import { useSetupData } from '../../hooks';
import type { BudgetSummary } from '@/types';
import { RpInput } from '../../components/RpInput';

function formatRp(n: number) { return `Rp${Math.round(n).toLocaleString('id-ID')}`; }

type BudgetRow = BudgetSummary;

export default function BudgetPage() {
  const { plan, role } = useAuth();
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);

  if (role !== 'ADMIN' && plan !== 'PRO') return <ProGate feature="Budget" />;
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<BudgetRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch('/api/budget'); setBudgets(await res.json()); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/budget', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Budget dihapus', 'success');
      setConfirmDeleteId(null);
      fetch_();
    } catch (err: any) { toast(err.message || 'Gagal menghapus', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budget</h1>
          <p className="text-sm text-slate-400">Budget per kategori per bulan</p>
        </div>
        <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Set Budget
        </button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>
        ) : budgets.length === 0 ? (
          <p className="text-center text-slate-500 py-10">Belum ada budget. Klik "Set Budget" untuk memulai.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-300 border-b border-slate-700">
                <th className="pb-3 pr-3">Bulan</th>
                <th className="pb-3 pr-3">Kategori</th>
                <th className="pb-3 pr-3 text-right">Budget</th>
                <th className="pb-3 pr-3 text-right">Realisasi</th>
                <th className="pb-3 pr-3 text-right">Selisih</th>
                <th className="pb-3 pr-3">Progress</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b, i) => (
                <tr key={b.id ?? i} className="border-b border-slate-700/50">
                  <td className="py-3 pr-3 text-slate-300">{b.month}</td>
                  <td className="py-3 pr-3 text-white">{b.category}</td>
                  <td className="py-3 pr-3 text-right text-slate-300">{formatRp(b.budgetAmount)}</td>
                  <td className="py-3 pr-3 text-right text-white font-medium">{formatRp(b.realisation)}</td>
                  <td className={`py-3 pr-3 text-right ${b.difference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatRp(b.difference)}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-700 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${Math.min(b.percentage, 100)}%`, background: b.percentage > 100 ? '#ef4444' : b.percentage >= 80 ? '#f59e0b' : '#10b981' }} />
                      </div>
                      <span className="text-xs text-slate-400">{b.percentage.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className={b.status === 'Aman' ? 'badge-success' : b.status === 'Hampir Over' ? 'badge-warning' : 'badge-danger'}>{b.status}</span>
                  </td>
                  <td className="py-3 text-center">
                    {b.id && confirmDeleteId === b.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <span className="text-xs text-slate-400 mr-1">Hapus?</span>
                        <button onClick={() => handleDelete(b.id!)} className="text-red-400 text-xs font-medium px-2 py-1 bg-red-500/10 rounded">Ya</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 text-xs px-2 py-1">Tidak</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-center">
                        {b.id && <button onClick={() => { setEditData(b); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>}
                        {b.id && <button onClick={() => setConfirmDeleteId(b.id!)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <BudgetForm
          onClose={() => { setShowForm(false); setEditData(null); }}
          onSuccess={() => { setShowForm(false); setEditData(null); fetch_(); }}
          editData={editData}
        />
      )}
    </div>
  );
}

function BudgetForm({ onClose, onSuccess, editData }: {
  onClose: () => void;
  onSuccess: () => void;
  editData?: BudgetRow | null;
}) {
  const { toast } = useToast();
  const { categories, loading: setupLoading } = useSetupData();
  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  function monthToInput(monthStr: string): string {
    if (!monthStr) return defaultMonth;
    const months: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', Mei: '05', Jun: '06', Jul: '07', Agu: '08', Sep: '09', Okt: '10', Nov: '11', Des: '12' };
    const parts = monthStr.split(' ');
    if (parts.length === 2 && months[parts[0]]) return `${parts[1]}-${months[parts[0]]}`;
    return defaultMonth;
  }

  function formatMonthForApi(ym: string): string {
    if (!ym) return '';
    const [year, month] = ym.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
  }

  const [form, setForm] = useState({
    month: editData ? monthToInput(editData.month) : defaultMonth,
    category: editData?.category ?? '',
    amount: editData?.budgetAmount?.toString() ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { setError('Pilih kategori'); return; }
    setSubmitting(true); setError('');
    try {
      if (editData?.id) {
        // Edit: just update the amount
        const res = await fetch('/api/budget', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editData.id, amount: form.amount }) });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch('/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: formatMonthForApi(form.month), category: form.category, amount: form.amount }) });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      toast(editData ? 'Budget berhasil diupdate!' : 'Budget berhasil disimpan!', 'success');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || 'Gagal menyimpan budget', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{editData ? 'Edit' : 'Set'} Budget</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Bulan</label>
            <input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="input-field w-full text-sm" required disabled={!!editData} />
          </div>
          <div>
            <label className="form-label">Kategori</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field w-full text-sm" required disabled={setupLoading || !!editData}>
              <option value="">{setupLoading ? 'Memuat...' : 'Pilih kategori'}</option>
              {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Budget</label>
            <RpInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder="1.000.000" required />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? 'Menyimpan...' : editData ? 'Update Budget' : 'Simpan Budget'}</button>
        </form>
      </div>
    </div>
  );
}
