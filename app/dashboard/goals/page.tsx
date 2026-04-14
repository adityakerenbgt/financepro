'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, X, Target, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '../../providers';
import { useAuth } from '../../auth-context';
import ProGate from '../../components/ProGate';
import type { GoalSummary } from '@/types';
import { RpInput } from '../../components/RpInput';

function formatRp(n: number) { return `Rp${Math.round(n).toLocaleString('id-ID')}`; }

export default function GoalsPage() {
  const { plan, role } = useAuth();
  const [goals, setGoals] = useState<GoalSummary[]>([]);

  if (role !== 'ADMIN' && plan !== 'PRO') return <ProGate feature="Goals" />;
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<GoalSummary | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch('/api/goals'); setGoals(await res.json()); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/goals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Goal dihapus', 'success');
      setConfirmDeleteId(null);
      fetch_();
    } catch (err: any) { toast(err.message || 'Gagal menghapus', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Goals</h1>
          <p className="text-sm text-slate-400">Target tabungan dengan deadline</p>
        </div>
        <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Goal
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-10">
          <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Belum ada goals. Mulai buat target tabungan!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(g => (
            <div key={g.id} className="card-hover">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white">{g.goalName}</h3>
                <div className="flex items-center gap-1">
                  <span className={`${g.status === 'Tercapai' ? 'badge-success' : g.status === 'Gagal' ? 'badge-danger' : 'badge-warning'} mr-1`}>
                    {g.status === 'On Track' ? 'On Track' : g.status}
                  </span>
                  {confirmDeleteId === g.id ? (
                    <>
                      <button onClick={() => handleDelete(g.id)} className="text-red-400 text-xs font-medium px-2 py-1 bg-red-500/10 rounded">Ya</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 text-xs px-2 py-1">Tidak</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditData(g); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirmDeleteId(g.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">Deadline: {new Date(g.targetDate).toLocaleDateString('id-ID')}</p>
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-white font-medium">{g.progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(g.progress, 100)}%`, background: g.progress >= 100 ? '#10b981' : g.progress >= 50 ? '#3b82f6' : '#f59e0b' }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-slate-400 text-xs">Target</p><p className="text-white font-medium">{formatRp(g.targetAmount)}</p></div>
                <div><p className="text-slate-400 text-xs">Terkumpul</p><p className="text-emerald-400 font-medium">{formatRp(g.accumulatedAmount)}</p></div>
                <div><p className="text-slate-400 text-xs">Sisa</p><p className="text-amber-400 font-medium">{formatRp(g.remaining)}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <GoalForm
          onClose={() => { setShowForm(false); setEditData(null); }}
          onSuccess={() => { setShowForm(false); setEditData(null); fetch_(); }}
          editData={editData}
        />
      )}
    </div>
  );
}

function GoalForm({ onClose, onSuccess, editData }: {
  onClose: () => void;
  onSuccess: () => void;
  editData?: GoalSummary | null;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    goalName: editData?.goalName ?? '',
    targetAmount: editData?.targetAmount?.toString() ?? '',
    targetDate: editData ? new Date(editData.targetDate).toISOString().split('T')[0] : '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const method = editData ? 'PATCH' : 'POST';
      const body = editData ? { id: editData.id, ...form } : form;
      const res = await fetch('/api/goals', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(editData ? 'Goal berhasil diupdate!' : 'Goal berhasil ditambahkan!', 'success');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || 'Gagal menyimpan goal', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{editData ? 'Edit' : 'Tambah'} Goal</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Nama Goal</label>
            <input type="text" value={form.goalName} onChange={e => setForm({ ...form, goalName: e.target.value })} className="input-field w-full text-sm" placeholder="Liburan Bali, DP Rumah..." required />
          </div>
          <div>
            <label className="form-label">Target</label>
            <RpInput value={form.targetAmount} onChange={v => setForm({ ...form, targetAmount: v })} placeholder="10.000.000" required />
          </div>
          <div>
            <label className="form-label">Deadline</label>
            <input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} className="input-field w-full text-sm" required />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? 'Menyimpan...' : editData ? 'Update Goal' : 'Simpan Goal'}</button>
        </form>
      </div>
    </div>
  );
}
