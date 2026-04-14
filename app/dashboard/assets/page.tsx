'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, X, TrendingUp, TrendingDown, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '../../providers';
import { useAuth } from '../../auth-context';
import ProGate from '../../components/ProGate';
import type { AssetSummary } from '@/types';
import { RpInput } from '../../components/RpInput';

function formatRp(n: number) { return `Rp${Math.round(n).toLocaleString('id-ID')}`; }

const ASSET_TYPES = ['Investasi', 'Dana Darurat', 'Properti', 'Kendaraan', 'Emas', 'Crypto', 'Lainnya'];

export default function AssetsPage() {
  const { plan, role } = useAuth();
  const { toast } = useToast();

  if (role !== 'ADMIN' && plan !== 'PRO') return <ProGate feature="Aset" />;
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<AssetSummary | null>(null);
  const [editValueId, setEditValueId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch('/api/assets'); setAssets(await res.json()); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const totalCapital = assets.reduce((s, a) => s + a.totalCapital, 0);
  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0);
  const totalPnL = totalValue - totalCapital;

  const handleUpdateValue = async (id: string) => {
    setSaving(true);
    try {
      await fetch('/api/assets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, currentValue: parseFloat(editValue) }) });
      toast('Nilai aset berhasil diupdate!', 'success');
      setEditValueId(null);
      fetch_();
    } catch { toast('Gagal mengupdate nilai aset', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/assets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Aset dihapus', 'success');
      setConfirmDeleteId(null);
      fetch_();
    } catch (err: any) { toast(err.message || 'Gagal menghapus', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Aset</h1>
          <p className="text-sm text-slate-400">Portofolio investasi dan kekayaan bersih</p>
        </div>
        <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Aset
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card"><p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total Modal</p><p className="text-xl font-bold text-white">{formatRp(totalCapital)}</p></div>
        <div className="card"><p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Nilai Saat Ini</p><p className="text-xl font-bold text-white">{formatRp(totalValue)}</p></div>
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Unrealized P&L</p>
          <div className="flex items-center gap-2">
            {totalPnL >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
            <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalPnL >= 0 ? '+' : ''}{formatRp(totalPnL)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>
      ) : assets.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">Belum ada aset. Tambah aset pertama Anda!</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-300 border-b border-slate-700">
                <th className="pb-3 pr-3">Instrumen</th>
                <th className="pb-3 pr-3">Jenis</th>
                <th className="pb-3 pr-3 text-right">Modal Awal</th>
                <th className="pb-3 pr-3 text-right">Total Modal</th>
                <th className="pb-3 pr-3 text-right">Nilai Sekarang</th>
                <th className="pb-3 pr-3 text-right">P&L</th>
                <th className="pb-3 pr-3 text-right">Return</th>
                <th className="pb-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3 pr-3 text-white font-medium">{a.instrumentName}</td>
                  <td className="py-3 pr-3 text-slate-400">{a.assetType}</td>
                  <td className="py-3 pr-3 text-right text-slate-300">{formatRp(a.initialCapital)}</td>
                  <td className="py-3 pr-3 text-right text-white">{formatRp(a.totalCapital)}</td>
                  <td className="py-3 pr-3 text-right">
                    {editValueId === a.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <RpInput value={editValue} onChange={v => setEditValue(v)} className="w-36" />
                        <button onClick={() => handleUpdateValue(a.id)} disabled={saving} className="text-emerald-400 hover:text-emerald-300 text-xs px-1">OK</button>
                        <button onClick={() => setEditValueId(null)} className="text-slate-500 hover:text-white text-xs px-1">X</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditValueId(a.id); setEditValue(String(a.currentValue)); }} className="text-white hover:text-blue-400 transition-colors" title="Klik untuk update nilai">
                        {formatRp(a.currentValue)}
                      </button>
                    )}
                  </td>
                  <td className={`py-3 pr-3 text-right font-medium ${a.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{a.profitLoss >= 0 ? '+' : ''}{formatRp(a.profitLoss)}</td>
                  <td className={`py-3 pr-3 text-right font-medium ${a.returnPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{a.returnPercentage >= 0 ? '+' : ''}{a.returnPercentage.toFixed(2)}%</td>
                  <td className="py-3 text-center">
                    {confirmDeleteId === a.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <span className="text-xs text-slate-400 mr-1">Hapus?</span>
                        <button onClick={() => handleDelete(a.id)} className="text-red-400 text-xs font-medium px-2 py-1 bg-red-500/10 rounded">Ya</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 text-xs px-2 py-1">Tidak</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={() => { setEditData(a); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDeleteId(a.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-3">Klik nilai sekarang untuk mengupdate secara manual</p>
        </div>
      )}

      {showForm && (
        <AssetForm
          onClose={() => { setShowForm(false); setEditData(null); }}
          onSuccess={() => { setShowForm(false); setEditData(null); fetch_(); }}
          editData={editData}
        />
      )}
    </div>
  );
}

function AssetForm({ onClose, onSuccess, editData }: {
  onClose: () => void;
  onSuccess: () => void;
  editData?: AssetSummary | null;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    assetType: editData?.assetType ?? '',
    instrumentName: editData?.instrumentName ?? '',
    initialCapital: editData?.initialCapital?.toString() ?? '',
    currentValue: editData?.currentValue?.toString() ?? '',
    startDate: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetType) { setError('Pilih jenis aset'); return; }
    setSubmitting(true); setError('');
    try {
      const method = editData ? 'PATCH' : 'POST';
      const body = editData ? { id: editData.id, ...form } : form;
      const res = await fetch('/api/assets', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(editData ? 'Aset berhasil diupdate!' : 'Aset berhasil ditambahkan!', 'success');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || 'Gagal menyimpan aset', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{editData ? 'Edit' : 'Tambah'} Aset</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Jenis Aset</label>
            <select value={form.assetType} onChange={e => setForm({ ...form, assetType: e.target.value })} className="input-field w-full text-sm" required>
              <option value="">Pilih jenis...</option>
              {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Nama Instrumen</label>
            <input type="text" value={form.instrumentName} onChange={e => setForm({ ...form, instrumentName: e.target.value })} className="input-field w-full text-sm" placeholder="BBCA, Makmur RDPT, Emas..." required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Modal Awal</label>
              <RpInput value={form.initialCapital} onChange={v => setForm({ ...form, initialCapital: v })} placeholder="0" />
            </div>
            <div>
              <label className="form-label">Nilai Sekarang</label>
              <RpInput value={form.currentValue} onChange={v => setForm({ ...form, currentValue: v })} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="form-label">Tanggal Mulai</label>
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="input-field w-full text-sm" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? 'Menyimpan...' : editData ? 'Update Aset' : 'Simpan Aset'}</button>
        </form>
      </div>
    </div>
  );
}
