'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, RefreshCw, X, Pencil, Trash2, Filter } from 'lucide-react';
import { useToast } from '../../providers';
import { useSetupData } from '../../hooks';
import { RpInput } from '../../components/RpInput';
import { useAuth } from '../../auth-context';
import ProGate from '../../components/ProGate';
import { formatMoney as formatRp } from '@/lib/currency';
import { assetTypeLabel } from '@/lib/labels';
import { useLang, localeOf } from '@/app/i18n';


const ASSET_TYPES = ['Investasi', 'Dana Darurat', 'Tabungan', 'Emas', 'Crypto', 'Properti'];
const TX_TYPES = ['Buy', 'Sell', 'Withdraw', 'Goals'] as const;

interface SavingsItem {
  id: string;
  invId: string;
  date: string;
  assetType: string;
  instrumentName: string;
  transactionType: string;
  nominal: number;
  pricePerUnit?: number;
  notes?: string;
  account?: { name: string };
}

export default function SavingsPage() {
  const { plan, role } = useAuth();
  const { t, lang } = useLang();
  const [items, setItems] = useState<SavingsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<SavingsItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [assetTypeFilter, setAssetTypeFilter] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const { toast } = useToast();

  if (role !== 'ADMIN' && plan !== 'PRO') return <ProGate feature="Nabung & Investasi" />;

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch('/api/savings'); setItems(await res.json()); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const filtered = useMemo(() => items.filter(s => {
    if (assetTypeFilter && s.assetType !== assetTypeFilter) return false;
    if (txTypeFilter && s.transactionType !== txTypeFilter) return false;
    return true;
  }), [items, assetTypeFilter, txTypeFilter]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/savings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(t('Data dihapus', 'Record deleted'), 'success');
      setConfirmDeleteId(null);
      fetch_();
    } catch (err: any) { toast(err.message || t('Gagal menghapus', 'Failed to delete'), 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('Nabung & Investasi', 'Savings & Investments')}</h1>
          <p className="text-sm text-slate-400">{t('Catat pembelian, penjualan, dan alokasi goals', 'Record purchases, sales, and goal allocations')}</p>
        </div>
        <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('Tambah', 'Add')}
        </button>
      </div>

      {/* Filter bar */}
      <div className="card flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <select value={assetTypeFilter} onChange={e => setAssetTypeFilter(e.target.value)} className="input-field text-sm">
          <option value="">{t('Semua Jenis Aset', 'All Asset Types')}</option>
          {ASSET_TYPES.map(at => <option key={at} value={at}>{assetTypeLabel(at, lang)}</option>)}
        </select>
        <select value={txTypeFilter} onChange={e => setTxTypeFilter(e.target.value)} className="input-field text-sm">
          <option value="">{t('Semua Tipe', 'All Types')}</option>
          {TX_TYPES.map(tt => <option key={tt} value={tt}>{tt}</option>)}
        </select>
        {(assetTypeFilter || txTypeFilter) && (
          <button onClick={() => { setAssetTypeFilter(''); setTxTypeFilter(''); }}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition-colors">Reset</button>
        )}
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} {t('data', 'records')}</span>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-500 py-10">{items.length === 0 ? t('Belum ada data.', 'No data yet.') : t('Tidak ada data yang cocok dengan filter.', 'No records match the filters.')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-300 border-b border-slate-700">
                <th className="pb-3 pr-3">ID</th>
                <th className="pb-3 pr-3">{t('Tanggal', 'Date')}</th>
                <th className="pb-3 pr-3">{t('Jenis Aset', 'Asset Type')}</th>
                <th className="pb-3 pr-3">{t('Instrumen', 'Instrument')}</th>
                <th className="pb-3 pr-3">{t('Tipe', 'Type')}</th>
                <th className="pb-3 pr-3 text-right">Nominal</th>
                <th className="pb-3 pr-3">{t('Rekening', 'Account')}</th>
                <th className="pb-3 text-center">{t('Aksi', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3 pr-3 text-slate-500 font-mono text-xs">{s.invId}</td>
                  <td className="py-3 pr-3 text-slate-300">{new Date(s.date).toLocaleDateString(localeOf(lang))}</td>
                  <td className="py-3 pr-3 text-white">{assetTypeLabel(s.assetType, lang)}</td>
                  <td className="py-3 pr-3 text-slate-300">{s.instrumentName}</td>
                  <td className="py-3 pr-3">
                    <span className={s.transactionType === 'Buy' || s.transactionType === 'Goals' ? 'badge-success' : 'badge-warning'}>{s.transactionType}</span>
                  </td>
                  <td className="py-3 pr-3 text-right text-white font-medium">{formatRp(s.nominal)}</td>
                  <td className="py-3 pr-3 text-slate-400">{s.account?.name}</td>
                  <td className="py-3 text-center">
                    {confirmDeleteId === s.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <span className="text-xs text-slate-400 mr-1">{t('Hapus?', 'Delete?')}</span>
                        <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-1 bg-red-500/10 rounded">{t('Ya', 'Yes')}</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 hover:text-white text-xs px-2 py-1">{t('Tidak', 'No')}</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={() => { setEditData(s); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDeleteId(s.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
        <SavingsForm
          onClose={() => { setShowForm(false); setEditData(null); }}
          onSuccess={() => { setShowForm(false); setEditData(null); fetch_(); }}
          editData={editData}
        />
      )}
    </div>
  );
}

function SavingsForm({ onClose, onSuccess, editData }: {
  onClose: () => void;
  onSuccess: () => void;
  editData?: SavingsItem | null;
}) {
  const { toast } = useToast();
  const { t, lang } = useLang();
  const { accounts, goals, assets, loading: setupLoading } = useSetupData();
  const [form, setForm] = useState({
    date: editData ? new Date(editData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    assetType: editData?.assetType ?? '',
    instrumentName: editData?.instrumentName ?? '',
    transactionType: editData?.transactionType ?? 'Buy',
    nominal: editData?.nominal?.toString() ?? '',
    pricePerUnit: editData?.pricePerUnit?.toString() ?? '',
    account: editData?.account?.name ?? '',
    notes: editData?.notes ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const instrumentOptions = form.transactionType === 'Goals'
    ? goals.map(g => ({ label: g, value: g }))
    : assets.map(a => ({ label: `${a.name} (${a.type})`, value: a.name }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetType) { setError(t('Pilih jenis aset', 'Select an asset type')); return; }
    if (!form.instrumentName) { setError(t('Pilih instrumen/goal', 'Select an instrument/goal')); return; }
    if (!form.account) { setError(t('Pilih rekening', 'Select an account')); return; }
    setSubmitting(true); setError('');
    try {
      const method = editData ? 'PATCH' : 'POST';
      const body = editData ? { id: editData.id, ...form } : form;
      const res = await fetch('/api/savings', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(editData ? t('Data berhasil diupdate!', 'Record updated!') : t('Data berhasil disimpan!', 'Record saved!'), 'success');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || t('Gagal menyimpan', 'Failed to save'), 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{editData ? 'Edit' : t('Tambah', 'Add')} {t('Nabung/Investasi', 'Savings/Investment')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">{t('Tipe Transaksi', 'Transaction Type')}</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-600">
              {TX_TYPES.map(tt => (
                <button key={tt} type="button" onClick={() => setForm({ ...form, transactionType: tt, instrumentName: '' })}
                  className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                    form.transactionType === tt
                      ? tt === 'Buy' || tt === 'Goals' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                  }`}>{tt}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">{t('Tanggal', 'Date')}</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field w-full text-sm" required />
            </div>
            <div>
              <label className="form-label">{t('Jenis Aset', 'Asset Type')}</label>
              <select value={form.assetType} onChange={e => setForm({ ...form, assetType: e.target.value })} className="input-field w-full text-sm" required>
                <option value="">{t('Pilih jenis...', 'Select type...')}</option>
                {ASSET_TYPES.map(at => <option key={at} value={at}>{assetTypeLabel(at, lang)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">{form.transactionType === 'Goals' ? t('Nama Goal', 'Goal Name') : t('Nama Instrumen', 'Instrument Name')}</label>
            {setupLoading ? (
              <div className="input-field w-full text-sm text-slate-500">{t('Memuat data...', 'Loading data...')}</div>
            ) : instrumentOptions.length > 0 ? (
              <select value={form.instrumentName} onChange={e => setForm({ ...form, instrumentName: e.target.value })} className="input-field w-full text-sm" required>
                <option value="">{t('Pilih', 'Select')} {form.transactionType === 'Goals' ? 'goal' : t('instrumen', 'instrument')}...</option>
                {instrumentOptions.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type="text" value={form.instrumentName} onChange={e => setForm({ ...form, instrumentName: e.target.value })} className="input-field w-full text-sm" placeholder={t('Nama instrumen...', 'Instrument name...')} required />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">{t('Nominal', 'Amount')}</label>
              <RpInput value={form.nominal} onChange={v => setForm({ ...form, nominal: v })} required />
            </div>
            <div>
              <label className="form-label">{t('Harga/Unit (opsional)', 'Price/Unit (optional)')}</label>
              <RpInput value={form.pricePerUnit} onChange={v => setForm({ ...form, pricePerUnit: v })} />
            </div>
          </div>
          <div>
            <label className="form-label">{t('Rekening', 'Account')}</label>
            <select value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} className="input-field w-full text-sm" required disabled={setupLoading}>
              <option value="">{setupLoading ? t('Memuat...', 'Loading...') : t('Pilih rekening', 'Select an account')}</option>
              {accounts.map(a => {
                const balanceText = formatRp(a.balance);
                return <option key={a.id} value={a.name}>{a.name} ({balanceText})</option>;
              })}
            </select>
          </div>
          <div>
            <label className="form-label">{t('Catatan (opsional)', 'Notes (optional)')}</label>
            <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field w-full text-sm" placeholder={t('Catatan tambahan...', 'Additional notes...')} />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? t('Menyimpan...', 'Saving...') : editData ? t('Update', 'Update') : t('Simpan', 'Save')}</button>
        </form>
      </div>
    </div>
  );
}
