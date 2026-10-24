'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, User, Tag, CreditCard, Edit2, Trash2, Plus, X } from 'lucide-react';
import { RpInput } from '../../components/RpInput';
import { useToast } from '../../providers';
import { formatMoney as formatRp } from '@/lib/currency';
import { useLang } from '@/app/i18n';
import { useCurrency } from '@/app/currency-context';
import CurrencySwitcher from '../../components/CurrencySwitcher';
import { accountTypeLabel } from '@/lib/labels';
import { fetchJson, fetchList } from '@/lib/clientFetch';


const ACC_TYPES = ['bank', 'cash', 'ewallet', 'credit_card', 'paylater'];
const CAT_TYPES = ['income', 'expense', 'both'];

export default function SettingsPage() {
  const { t, lang } = useLang();
  const { currency: displayCurrency } = useCurrency();
  const [profile, setProfile] = useState({ name: '', currency: 'IDR', targetSavings: '', targetExpense: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  // Modals state
  const [showCatModal, setShowCatModal] = useState(false);
  const [catModalMode, setCatModalMode] = useState<'add' | 'edit'>('add');
  const [catForm, setCatForm] = useState({ id: '', name: '', type: 'expense' });
  const [catSubmitting, setCatSubmitting] = useState(false);

  const [showAccModal, setShowAccModal] = useState(false);
  const [accModalMode, setAccModalMode] = useState<'add' | 'edit'>('add');
  const [accForm, setAccForm] = useState({ id: '', name: '', type: 'bank', initialBalance: '' });
  const [accSubmitting, setAccSubmitting] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'cat' | 'acc' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [profileData, catList, accList] = await Promise.all([
          fetchJson('/api/setup'),
          fetchList('/api/categories'),
          fetchList('/api/accounts'),
        ]);
        if (profileData.profile) {
          setProfile({
            name: profileData.profile.name || '',
            currency: profileData.profile.currency || 'IDR',
            targetSavings: profileData.profile.targetSavings?.toString() || '',
            targetExpense: profileData.profile.targetExpense?.toString() || '',
          });
        }
        setCategories(catList);
        setAccounts(accList);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', ...profile, currency: displayCurrency }),
      });
      setSaved(true);
      toast(t('Profil berhasil disimpan', 'Profile saved'), 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      toast(err.message || 'Gagal menyimpan', 'error');
    } finally { setSaving(false); }
  };

  // Category handlers
  const openAddCatModal = () => {
    setCatForm({ id: '', name: '', type: 'expense' });
    setCatModalMode('add');
    setShowCatModal(true);
  };

  const openEditCatModal = (cat: any) => {
    setCatForm({ id: cat.id, name: cat.name, type: cat.type });
    setCatModalMode('edit');
    setShowCatModal(true);
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) {
      toast(t('Nama kategori tidak boleh kosong', 'Category name cannot be empty'), 'error');
      return;
    }
    setCatSubmitting(true);
    try {
      const method = catModalMode === 'add' ? 'POST' : 'PATCH';
      const body = catModalMode === 'add'
        ? { name: catForm.name, type: catForm.type }
        : { id: catForm.id, name: catForm.name, type: catForm.type };

      const res = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();

      if (catModalMode === 'add') {
        setCategories(prev => [...prev, updated]);
        toast(t('Kategori berhasil ditambahkan', 'Category added'), 'success');
      } else {
        setCategories(prev => prev.map(c => c.id === catForm.id ? updated : c));
        toast(t('Kategori berhasil diupdate', 'Category updated'), 'success');
      }
      setShowCatModal(false);
    } catch (err: any) {
      toast(err.message || 'Gagal menyimpan', 'error');
    } finally { setCatSubmitting(false); }
  };

  // Account handlers
  const openAddAccModal = () => {
    setAccForm({ id: '', name: '', type: 'bank', initialBalance: '' });
    setAccModalMode('add');
    setShowAccModal(true);
  };

  const openEditAccModal = (acc: any) => {
    setAccForm({ id: acc.id, name: acc.name, type: acc.type, initialBalance: '' });
    setAccModalMode('edit');
    setShowAccModal(true);
  };

  const handleSaveAccount = async () => {
    if (!accForm.name.trim()) {
      toast(t('Nama rekening tidak boleh kosong', 'Account name cannot be empty'), 'error');
      return;
    }
    setAccSubmitting(true);
    try {
      const method = accModalMode === 'add' ? 'POST' : 'PATCH';
      const body = accModalMode === 'add'
        ? { name: accForm.name, type: accForm.type, initialBalance: accForm.initialBalance }
        : { id: accForm.id, name: accForm.name, type: accForm.type };

      const res = await fetch('/api/accounts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();

      if (accModalMode === 'add') {
        setAccounts(prev => [...prev, updated]);
        toast(t('Rekening berhasil ditambahkan', 'Account added'), 'success');
      } else {
        setAccounts(prev => prev.map(a => a.id === accForm.id ? updated : a));
        toast(t('Rekening berhasil diupdate', 'Account updated'), 'success');
      }
      setShowAccModal(false);
    } catch (err: any) {
      toast(err.message || 'Gagal menyimpan', 'error');
    } finally { setAccSubmitting(false); }
  };

  // Delete handlers
  const openDeleteModal = (type: 'cat' | 'acc', id: string) => {
    setDeleteType(type);
    setDeleteId(id);
    setDeleteConfirmed(false);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmed) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(deleteType === 'cat' ? '/api/categories' : '/api/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      if (deleteType === 'cat') {
        setCategories(prev => prev.filter(c => c.id !== deleteId));
        toast(t('Kategori berhasil dihapus', 'Category deleted'), 'success');
      } else {
        setAccounts(prev => prev.filter(a => a.id !== deleteId));
        toast(t('Rekening berhasil dihapus', 'Account deleted'), 'success');
      }
      setDeleteModalOpen(false);
    } catch (err: any) {
      toast(err.message || t('Gagal menghapus', 'Failed to delete'), 'error');
    } finally { setDeleteSubmitting(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">{t('Pengaturan', 'Settings')}</h1>

      {/* Profile */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-white">{t('Profil Pengguna', 'User Profile')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">{t('Nama', 'Name')}</label>
            <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})}
              className="input-field w-full text-sm" placeholder={t('Nama Anda', 'Your name')} />
          </div>
          <div>
            <label className="form-label">{t('Mata Uang Tampilan', 'Display Currency')}</label>
            <CurrencySwitcher />
          </div>
          <div>
            <label className="form-label">{t('Target Tabungan/Bulan', 'Monthly Savings Target')} <span className="text-slate-500 font-normal">({t('dalam Rupiah', 'in Rupiah')})</span></label>
            <RpInput value={profile.targetSavings} onChange={v => setProfile({...profile, targetSavings: v})} placeholder="5.000.000" />
          </div>
          <div>
            <label className="form-label">{t('Target Pengeluaran/Bulan', 'Monthly Spending Target')} <span className="text-slate-500 font-normal">({t('dalam Rupiah', 'in Rupiah')})</span></label>
            <RpInput value={profile.targetExpense} onChange={v => setProfile({...profile, targetExpense: v})} placeholder="10.000.000" />
          </div>
        </div>
        <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? t('Menyimpan...', 'Saving...') : saved ? t('✓ Tersimpan!', '✓ Saved!') : t('Simpan Profil', 'Save Profile')}
        </button>
      </div>

      {/* Categories */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-white">{t('Kategori Transaksi', 'Transaction Categories')}</h2>
            <span className="text-xs text-slate-400">({categories.length})</span>
          </div>
          <button onClick={openAddCatModal} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
            <Plus className="w-3 h-3" /> {t('Tambah', 'Add')}
          </button>
        </div>

        {categories.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">{t('Belum ada kategori. Klik tombol Tambah untuk memulai.', 'No categories yet. Click Add to get started.')}</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{cat.name}</p>
                  <p className="text-xs text-slate-400">{cat.type === 'income' ? t('Masuk', 'Income') : cat.type === 'expense' ? t('Keluar', 'Expense') : t('Semua', 'All')} • {cat._count?.transactions || 0} {t('transaksi', 'transactions')}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditCatModal(cat)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                    title={t('Edit kategori', 'Edit category')}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openDeleteModal('cat', cat.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title={t('Hapus kategori', 'Delete category')}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accounts */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-violet-400" />
            <h2 className="font-semibold text-white">{t('Rekening & Sumber Dana', 'Accounts & Funding Sources')}</h2>
            <span className="text-xs text-slate-400">({accounts.length})</span>
          </div>
          <button onClick={openAddAccModal} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
            <Plus className="w-3 h-3" /> {t('Tambah', 'Add')}
          </button>
        </div>

        {accounts.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">{t('Belum ada rekening. Klik tombol Tambah untuk memulai.', 'No accounts yet. Click Add to get started.')}</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{acc.name}</p>
                  <p className="text-xs text-slate-400">{accountTypeLabel(acc.type, lang)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-emerald-400">{formatRp(acc.balance)}</p>
                  <div className="flex gap-1">
                    <button onClick={() => openEditAccModal(acc)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                      title={t('Edit rekening', 'Edit account')}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openDeleteModal('acc', acc.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title={t('Hapus rekening', 'Delete account')}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCatModal && (
        <CategoryModal
          mode={catModalMode}
          form={catForm}
          onFormChange={setCatForm}
          onSubmit={handleSaveCategory}
          onClose={() => setShowCatModal(false)}
          submitting={catSubmitting}
        />
      )}

      {showAccModal && (
        <AccountModal
          mode={accModalMode}
          form={accForm}
          onFormChange={setAccForm}
          onSubmit={handleSaveAccount}
          onClose={() => setShowAccModal(false)}
          submitting={accSubmitting}
        />
      )}

      {deleteModalOpen && (
        <DeleteConfirmModal
          type={deleteType === 'cat' ? t('kategori', 'category') : t('rekening', 'account')}
          itemName={deleteType === 'cat'
            ? categories.find(c => c.id === deleteId)?.name
            : accounts.find(a => a.id === deleteId)?.name}
          confirmed={deleteConfirmed}
          onConfirmedChange={setDeleteConfirmed}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteModalOpen(false)}
          submitting={deleteSubmitting}
        />
      )}
    </div>
  );
}

function CategoryModal({ mode, form, onFormChange, onSubmit, onClose, submitting }: {
  mode: 'add' | 'edit';
  form: any;
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
          <h2 className="text-lg font-bold text-white">{mode === 'add' ? t('Tambah Kategori', 'Add Category') : t('Edit Kategori', 'Edit Category')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="form-label">{t('Nama Kategori', 'Category Name')}</label>
            <input type="text" value={form.name} onChange={e => onFormChange({...form, name: e.target.value})}
              className="input-field w-full text-sm" placeholder={t('Makan, Transportasi, Gaji...', 'Food, Transport, Salary...')} autoFocus />
          </div>
          <div>
            <label className="form-label">{t('Tipe', 'Type')}</label>
            <select value={form.type} onChange={e => onFormChange({...form, type: e.target.value})} className="input-field w-full text-sm">
              <option value="expense">{t('Pengeluaran', 'Expense')}</option>
              <option value="income">{t('Pemasukan', 'Income')}</option>
              <option value="both">{t('Keduanya', 'Both')}</option>
            </select>
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

function AccountModal({ mode, form, onFormChange, onSubmit, onClose, submitting }: {
  mode: 'add' | 'edit';
  form: any;
  onFormChange: (f: any) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const { t, lang } = useLang();
  const ACC_TYPES = ['bank', 'cash', 'ewallet', 'credit_card', 'paylater'];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{mode === 'add' ? t('Tambah Rekening', 'Add Account') : t('Edit Rekening', 'Edit Account')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="form-label">{t('Nama Rekening', 'Account Name')}</label>
            <input type="text" value={form.name} onChange={e => onFormChange({...form, name: e.target.value})}
              className="input-field w-full text-sm" placeholder={t('BCA, GoPay, Tunai...', 'Bank, E-wallet, Cash...')} autoFocus />
          </div>
          <div>
            <label className="form-label">{t('Tipe', 'Type')}</label>
            <select value={form.type} onChange={e => onFormChange({...form, type: e.target.value})} className="input-field w-full text-sm">
              {ACC_TYPES.map(at => <option key={at} value={at}>{accountTypeLabel(at, lang)}</option>)}
            </select>
          </div>
          {mode === 'add' && (
            <div>
              <label className="form-label">{t('Saldo Awal (opsional)', 'Initial Balance (optional)')} <span className="text-slate-500 font-normal">({t('dalam Rupiah', 'in Rupiah')})</span></label>
              <RpInput value={form.initialBalance} onChange={v => onFormChange({...form, initialBalance: v})} placeholder="0" />
            </div>
          )}
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

function DeleteConfirmModal({ type, itemName, confirmed, onConfirmedChange, onConfirm, onCancel, submitting }: {
  type: string;
  itemName?: string;
  confirmed: boolean;
  onConfirmedChange: (c: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-white mb-2">{t('Hapus', 'Delete')} {type}?</h2>
        <p className="text-slate-300 text-sm mb-4">
          {t('Anda akan menghapus', 'You are about to delete')} <strong>{itemName}</strong>. {t('Tindakan ini tidak bisa dibatalkan.', 'This action cannot be undone.')}
        </p>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => onConfirmedChange(e.target.checked)}
              className="rounded border-slate-600" />
            <span className="text-sm text-red-300">{t('Saya yakin ingin menghapus', 'I am sure I want to delete this')}</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={onConfirm} disabled={!confirmed || submitting}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
              confirmed && !submitting
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}>
            {submitting ? t('Menghapus...', 'Deleting...') : t('Hapus', 'Delete')}
          </button>
          <button onClick={onCancel} className="btn-secondary flex-1">{t('Batal', 'Cancel')}</button>
        </div>
      </div>
    </div>
  );
}
