'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, RefreshCw, X, Pencil, Trash2, ArrowLeftRight, Search } from 'lucide-react';
import { useToast } from '../providers';
import { useSetupData } from '../hooks';
import { RpInput } from '../components/RpInput';
import { formatMoney as formatRp } from '@/lib/currency';
import { useLang, localeOf } from '@/app/i18n';
import { fetchList } from '@/lib/clientFetch';
import DateRangePresets from '../components/DateRangePresets';

const PAGE_SIZE = 25;

interface Transaction {
  id: string;
  txId: string;
  date: string;
  category: { name: string };
  description: string;
  account: { name: string };
  type: 'Pemasukan' | 'Pengeluaran';
  amount: number;
  note?: string;
}

interface Transfer {
  id: string;
  txId: string;
  date: string;
  fromAccount: { name: string };
  toAccount: { name: string };
  amount: number;
  notes?: string;
}


export default function TransactionsPage() {
  const { t, lang } = useLang();
  const [activeTab, setActiveTab] = useState<'transaksi' | 'transfer'>('transaksi');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [editData, setEditData] = useState<Transaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTransferId, setConfirmDeleteTransferId] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { toast } = useToast();
  const { categories } = useSetupData();

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (typeFilter) params.set('type', typeFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((currentPage - 1) * PAGE_SIZE));
      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [startDate, endDate, typeFilter, categoryFilter, search, currentPage]);

  const fetchTransfers = useCallback(async () => {
    try { setTransfers(await fetchList('/api/transfer')); } catch {}
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  // Reset to page 1 when any filter changes (but not currentPage itself)
  const resetPage = () => setCurrentPage(1);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/transactions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(t('Transaksi dihapus', 'Transaction deleted'), 'success');
      setConfirmDeleteId(null);
      fetchTransactions();
    } catch (err: any) { toast(err.message || 'Gagal menghapus', 'error'); }
  };

  const handleDeleteTransfer = async (id: string) => {
    try {
      const res = await fetch('/api/transfer', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(t('Transfer dihapus', 'Transfer deleted'), 'success');
      setConfirmDeleteTransferId(null);
      fetchTransfers();
    } catch (err: any) { toast(err.message || 'Gagal menghapus', 'error'); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, total);

  // Page number buttons: show at most 5, centered around currentPage
  const pageNumbers = (() => {
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('Transaksi', 'Transactions')}</h1>
          <p className="text-sm text-slate-400">{total} {t('transaksi total', 'transactions in total')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTransferForm(true)} className="btn-secondary flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" /> Transfer
          </button>
          <button onClick={() => { setEditData(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t('Tambah Transaksi', 'Add Transaction')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden border border-slate-700 w-fit">
        {(['transaksi', 'transfer'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-medium transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}>
            {tab === 'transaksi' ? t('Transaksi', 'Transactions') : 'Transfer'}
          </button>
        ))}
      </div>

      {activeTab === 'transaksi' && (
        <>
          {/* Filter bar */}
          <div className="card space-y-3">
            {/* Row 1: search + type + category */}
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); resetPage(); }}
                  placeholder={t('Cari deskripsi...', 'Search description...')}
                  className="input-field w-full text-sm pl-9"
                />
              </div>
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); resetPage(); }} className="input-field text-sm">
                <option value="">{t('Semua Jenis', 'All Types')}</option>
                <option value="Pemasukan">{t('Pemasukan', 'Income')}</option>
                <option value="Pengeluaran">{t('Pengeluaran', 'Expense')}</option>
              </select>
              <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); resetPage(); }} className="input-field text-sm">
                <option value="">{t('Semua Kategori', 'All Categories')}</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            {/* Row 2: date range */}
            <DateRangePresets
              startDate={startDate}
              endDate={endDate}
              onChange={(s, e) => { setStartDate(s); setEndDate(e); resetPage(); }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400 w-14 shrink-0">{t('Periode', 'Period')}</span>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); resetPage(); }} className="input-field text-sm" />
              <span className="text-slate-400">—</span>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); resetPage(); }} className="input-field text-sm" />
              <button onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); setTypeFilter(''); setCategoryFilter(''); resetPage(); }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition-colors">
                Reset
              </button>
              <button onClick={fetchTransactions} className="btn-secondary text-sm px-3 py-2 ml-auto"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="card overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-slate-400 py-10">
                {search || typeFilter || categoryFilter || startDate || endDate ? t('Tidak ada transaksi yang cocok dengan filter.', 'No transactions match the filters.') : t('Belum ada transaksi.', 'No transactions yet.')}
              </p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-300 border-b border-slate-700">
                      <th className="pb-3 pr-3 font-semibold">ID</th>
                      <th className="pb-3 pr-3 font-semibold">{t('Tanggal', 'Date')}</th>
                      <th className="pb-3 pr-3 font-semibold">{t('Kategori', 'Category')}</th>
                      <th className="pb-3 pr-3 font-semibold">{t('Deskripsi', 'Description')}</th>
                      <th className="pb-3 pr-3 font-semibold">{t('Rekening', 'Account')}</th>
                      <th className="pb-3 pr-3 font-semibold">{t('Jenis', 'Type')}</th>
                      <th className="pb-3 pr-3 text-right font-semibold">{t('Jumlah', 'Amount')}</th>
                      <th className="pb-3 text-center font-semibold">{t('Aksi', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="py-3 pr-3 text-slate-400 font-mono text-xs">{tx.txId}</td>
                        <td className="py-3 pr-3 text-slate-300">{new Date(tx.date).toLocaleDateString(localeOf(lang))}</td>
                        <td className="py-3 pr-3 text-white">{tx.category.name}</td>
                        <td className="py-3 pr-3 text-slate-300">{tx.description}</td>
                        <td className="py-3 pr-3 text-slate-400">{tx.account.name}</td>
                        <td className="py-3 pr-3">
                          <span className={tx.type === 'Pemasukan' ? 'badge-success' : 'badge-danger'}>{tx.type === 'Pemasukan' ? t('Pemasukan', 'Income') : t('Pengeluaran', 'Expense')}</span>
                        </td>
                        <td className={`py-3 pr-3 text-right font-medium ${tx.type === 'Pemasukan' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.type === 'Pemasukan' ? '+' : '-'}{formatRp(tx.amount)}
                        </td>
                        <td className="py-3 text-center">
                          {confirmDeleteId === tx.id ? (
                            <div className="flex items-center gap-1 justify-center">
                              <span className="text-xs text-slate-300 mr-1">{t('Hapus?', 'Delete?')}</span>
                              <button onClick={() => handleDelete(tx.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 bg-red-500/10 rounded">{t('Ya', 'Yes')}</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="text-slate-300 hover:text-white text-xs px-2 py-1">{t('Tidak', 'No')}</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 justify-center">
                              <button onClick={() => { setEditData(tx); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setConfirmDeleteId(tx.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title={t('Hapus', 'Delete')}><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-700">
                  <span className="text-xs text-slate-400">
                    {t('Menampilkan', 'Showing')} {pageStart}–{pageEnd} {t('dari', 'of')} {total} {t('transaksi', 'transactions')}
                  </span>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="px-3 py-1.5 text-xs rounded bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >← Prev</button>
                      {pageNumbers.map(p => (
                        <button key={p} onClick={() => setCurrentPage(p)}
                          className={`px-3 py-1.5 text-xs rounded transition-colors ${currentPage === p ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-700 text-slate-300 hover:text-white'}`}>
                          {p}
                        </button>
                      ))}
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="px-3 py-1.5 text-xs rounded bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >Next →</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'transfer' && (
        <div className="card overflow-x-auto">
          {transfers.length === 0 ? (
            <div className="text-center py-10">
              <ArrowLeftRight className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">{t('Belum ada transfer. Klik "Transfer" untuk memindahkan saldo antar rekening.', 'No transfers yet. Click "Transfer" to move money between accounts.')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300 border-b border-slate-700">
                  <th className="pb-3 pr-3 font-semibold">ID</th>
                  <th className="pb-3 pr-3 font-semibold">{t('Tanggal', 'Date')}</th>
                  <th className="pb-3 pr-3 font-semibold">{t('Dari', 'From')}</th>
                  <th className="pb-3 pr-3 font-semibold">{t('Ke', 'To')}</th>
                  <th className="pb-3 pr-3 text-right font-semibold">{t('Jumlah', 'Amount')}</th>
                  <th className="pb-3 pr-3 font-semibold">{t('Catatan', 'Notes')}</th>
                  <th className="pb-3 text-center font-semibold">{t('Aksi', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(tr => (
                  <tr key={tr.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 pr-3 text-slate-400 font-mono text-xs">{tr.txId}</td>
                    <td className="py-3 pr-3 text-slate-300">{new Date(tr.date).toLocaleDateString(localeOf(lang))}</td>
                    <td className="py-3 pr-3 text-red-400">{tr.fromAccount.name}</td>
                    <td className="py-3 pr-3 text-emerald-400">{tr.toAccount.name}</td>
                    <td className="py-3 pr-3 text-right text-white font-medium">{formatRp(tr.amount)}</td>
                    <td className="py-3 pr-3 text-slate-400 text-xs">{tr.notes || '—'}</td>
                    <td className="py-3 text-center">
                      {confirmDeleteTransferId === tr.id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <span className="text-xs text-slate-300 mr-1">{t('Hapus?', 'Delete?')}</span>
                          <button onClick={() => handleDeleteTransfer(tr.id)} className="text-red-400 text-xs font-semibold px-2 py-1 bg-red-500/10 rounded">{t('Ya', 'Yes')}</button>
                          <button onClick={() => setConfirmDeleteTransferId(null)} className="text-slate-300 text-xs px-2 py-1">{t('Tidak', 'No')}</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteTransferId(tr.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title={t('Hapus', 'Delete')}><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <TransactionForm
          onClose={() => { setShowForm(false); setEditData(null); }}
          onSuccess={() => { setShowForm(false); setEditData(null); fetchTransactions(); }}
          editData={editData}
        />
      )}
      {showTransferForm && (
        <TransferForm onClose={() => setShowTransferForm(false)} onSuccess={() => { setShowTransferForm(false); fetchTransfers(); }} />
      )}
    </div>
  );
}

function TransactionForm({ onClose, onSuccess, editData }: {
  onClose: () => void; onSuccess: () => void; editData?: Transaction | null;
}) {
  const { toast } = useToast();
  const { t } = useLang();
  const { categories, accounts, loading: setupLoading } = useSetupData();
  const [form, setForm] = useState({
    date: editData ? new Date(editData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    category: editData?.category.name ?? '',
    description: editData?.description ?? '',
    account: editData?.account.name ?? '',
    type: (editData?.type ?? 'Pengeluaran') as 'Pemasukan' | 'Pengeluaran',
    amount: editData?.amount?.toString() ?? '',
    note: editData?.note ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filteredCategories = categories.filter(c =>
    form.type === 'Pemasukan' ? c.type === 'income' || c.type === 'both' : c.type === 'expense' || c.type === 'both'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { setError(t('Pilih kategori', 'Select a category')); return; }
    if (!form.account) { setError(t('Pilih rekening', 'Select an account')); return; }
    setError(''); setSubmitting(true);
    try {
      const method = editData ? 'PATCH' : 'POST';
      const body = editData ? { id: editData.id, ...form } : form;
      const res = await fetch('/api/transactions', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || t('Gagal menyimpan', 'Failed to save'));
      toast(editData ? t('Transaksi berhasil diupdate!', 'Transaction updated!') : t('Transaksi berhasil disimpan!', 'Transaction saved!'), 'success');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || t('Gagal menyimpan', 'Failed to save'), 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{editData ? t('Edit Transaksi', 'Edit Transaction') : t('Tambah Transaksi', 'Add Transaction')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">{t('Jenis Transaksi', 'Transaction Type')}</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-600">
              {['Pengeluaran', 'Pemasukan'].map(ty => (
                <button key={ty} type="button" onClick={() => setForm({ ...form, type: ty as any, category: '' })}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${form.type === ty ? (ty === 'Pemasukan' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white') : 'bg-slate-700 text-slate-300 hover:text-white'}`}>{ty === 'Pemasukan' ? t('Pemasukan', 'Income') : t('Pengeluaran', 'Expense')}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">{t('Tanggal', 'Date')}</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field w-full text-sm" required />
            </div>
            <div>
              <label className="form-label">{t('Kategori', 'Category')}</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field w-full text-sm" required disabled={setupLoading}>
                <option value="">{setupLoading ? t('Memuat...', 'Loading...') : t('Pilih kategori', 'Select a category')}</option>
                {filteredCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">{t('Deskripsi', 'Description')}</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field w-full text-sm" placeholder={t('Contoh: Nasi goreng', 'e.g. Fried rice')} required />
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
            <label className="form-label">{t('Jumlah', 'Amount')}</label>
            <RpInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder="50.000" required />
          </div>
          <div>
            <label className="form-label">{t('Catatan (opsional)', 'Notes (optional)')}</label>
            <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="input-field w-full text-sm" placeholder={t('Catatan tambahan...', 'Additional notes...')} />
          </div>
          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? t('Menyimpan...', 'Saving...') : editData ? t('Update Transaksi', 'Update Transaction') : t('Simpan Transaksi', 'Save Transaction')}
          </button>
        </form>
      </div>
    </div>
  );
}

function TransferForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const { t } = useLang();
  const { accounts, loading: setupLoading } = useSetupData();
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], fromAccount: '', toAccount: '', amount: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.fromAccount === form.toAccount) { setError(t('Rekening asal dan tujuan tidak boleh sama', 'Source and destination accounts must differ')); return; }
    setError(''); setSubmitting(true);
    try {
      const res = await fetch('/api/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || t('Gagal menyimpan', 'Failed to save'));
      toast(t('Transfer berhasil dicatat!', 'Transfer recorded!'), 'success');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || t('Gagal menyimpan transfer', 'Failed to save transfer'), 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{t('Transfer Antar Rekening', 'Transfer Between Accounts')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">{t('Tanggal', 'Date')}</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field w-full text-sm" required />
          </div>
          <div>
            <label className="form-label">{t('Dari Rekening', 'From Account')}</label>
            <select value={form.fromAccount} onChange={e => setForm({ ...form, fromAccount: e.target.value })} className="input-field w-full text-sm" required disabled={setupLoading}>
              <option value="">{setupLoading ? t('Memuat...', 'Loading...') : t('Pilih rekening asal', 'Select source account')}</option>
              {accounts.map(a => {
                const balanceText = formatRp(a.balance);
                return <option key={a.id} value={a.name}>{a.name} ({balanceText})</option>;
              })}
            </select>
          </div>
          <div>
            <label className="form-label">{t('Ke Rekening', 'To Account')}</label>
            <select value={form.toAccount} onChange={e => setForm({ ...form, toAccount: e.target.value })} className="input-field w-full text-sm" required disabled={setupLoading}>
              <option value="">{setupLoading ? t('Memuat...', 'Loading...') : t('Pilih rekening tujuan', 'Select destination account')}</option>
              {accounts.filter(a => a.name !== form.fromAccount).map(a => {
                const balanceText = formatRp(a.balance);
                return <option key={a.id} value={a.name}>{a.name} ({balanceText})</option>;
              })}
            </select>
          </div>
          <div>
            <label className="form-label">{t('Jumlah', 'Amount')}</label>
            <RpInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder="500.000" required />
          </div>
          <div>
            <label className="form-label">{t('Catatan (opsional)', 'Notes (optional)')}</label>
            <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field w-full text-sm" placeholder={t('Top up Gopay, dll...', 'E-wallet top-up, etc...')} />
          </div>
          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? t('Menyimpan...', 'Saving...') : t('Simpan Transfer', 'Save Transfer')}</button>
        </form>
      </div>
    </div>
  );
}
