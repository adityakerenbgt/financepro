'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/auth-context';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, KeyRound, ShieldCheck, User, Pencil, Sparkles } from 'lucide-react';
import { useLang, localeOf } from '@/app/i18n';
import { TRIAL_DAYS } from '@/lib/plans';

interface AppUser {
  id: string;
  username: string;
  displayName: string | null;
  role: 'ADMIN' | 'USER';
  plan: 'FREE' | 'PRO';
  planExpiresAt: string | null;
  isTrial?: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const { t, lang, tError } = useLang();
  const { role, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [fetching, setFetching] = useState(true);

  // Add user form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', displayName: '', password: '', role: 'USER' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit user form
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', password: '', role: 'USER', plan: 'FREE', planExpiresAt: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!loading && role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [role, loading, router]);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers(await res.json());
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (role === 'ADMIN') fetchUsers();
  }, [role]);

  const handleAdd = async () => {
    setAddError('');
    if (!addForm.username || !addForm.password) { setAddError(t('Username dan password wajib diisi', 'Username and password are required')); return; }
    setAddLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(tError(data.error || t('Gagal menambah user', 'Failed to add user'))); return; }
      setShowAdd(false);
      setAddForm({ username: '', displayName: '', password: '', role: 'USER' });
      fetchUsers();
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setEditError('');
    setEditLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editUser.id, ...editForm }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(tError(data.error || t('Gagal update user', 'Failed to update user'))); return; }
      setEditUser(null);
      fetchUsers();
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (u: AppUser) => {
    if (!confirm(t(`Hapus user "${u.username}"? Semua data user ini akan ikut terhapus.`, `Delete user "${u.username}"? All of this user's data will be deleted too.`))) return;
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id }),
    });
    fetchUsers();
  };

  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setEditForm({
      displayName: u.displayName || '',
      password: '',
      role: u.role,
      plan: u.plan,
      planExpiresAt: u.planExpiresAt ? u.planExpiresAt.slice(0, 10) : '',
    });
    setEditError('');
  };

  const handleSetPro = async (u: AppUser) => {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, plan: 'PRO', planExpiresAt: expiry.toISOString() }),
    });
    fetchUsers();
  };

  const handleSetFree = async (u: AppUser) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, plan: 'FREE', planExpiresAt: null }),
    });
    fetchUsers();
  };

  if (loading || role !== 'ADMIN') return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-sm mt-1">{t('Kelola akun pengguna aplikasi', 'Manage application user accounts')}</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(''); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {t('Tambah User', 'Add User')}
        </button>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-white">{t('Tambah User Baru', 'Add New User')}</h2>
            {addError && <p className="text-red-400 text-sm">{addError}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Username</label>
                <input
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={addForm.username}
                  onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="username"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">{t('Nama Lengkap', 'Full Name')}</label>
                <input
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={addForm.displayName}
                  onChange={e => setAddForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder={t('Nama Lengkap (opsional)', 'Full name (optional)')}
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Password</label>
                <input
                  type="password"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={addForm.password}
                  onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Password"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Role</label>
                <select
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={addForm.role}
                  onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAdd}
                disabled={addLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {addLoading ? t('Menyimpan...', 'Saving...') : t('Simpan', 'Save')}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {t('Batal', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-white">{t('Edit User', 'Edit User')}: {editUser.username}</h2>
            {editError && <p className="text-red-400 text-sm">{editError}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">{t('Nama Lengkap', 'Full Name')}</label>
                <input
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.displayName}
                  onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder={t('Nama Lengkap', 'Full name')}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> {t('Password Baru (kosongkan jika tidak diubah)', 'New Password (leave blank to keep)')}
                </label>
                <input
                  type="password"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={t('Password baru', 'New password')}
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Role</label>
                <select
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Plan</label>
                <select
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={editForm.plan}
                  onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                >
                  <option value="FREE">Free</option>
                  <option value="PRO">PRO</option>
                </select>
              </div>
              {editForm.plan === 'PRO' && (
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">{t('Aktif sampai', 'Active until')}</label>
                  <input
                    type="date"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    value={editForm.planExpiresAt}
                    onChange={e => setEditForm(f => ({ ...f, planExpiresAt: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleEdit}
                disabled={editLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {editLoading ? t('Menyimpan...', 'Saving...') : t('Simpan', 'Save')}
              </button>
              <button
                onClick={() => setEditUser(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {t('Batal', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {fetching ? (
          <div className="p-8 text-center text-slate-400">{t('Memuat data...', 'Loading data...')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Username</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">{t('Nama', 'Name')}</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Role</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">{t('Dibuat', 'Created')}</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">{t('Aksi', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-slate-300">{u.displayName || '-'}</td>
                  <td className="px-4 py-3">
                    {u.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full text-xs font-medium">
                        <ShieldCheck className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-700 text-slate-300 border border-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">
                        <User className="w-3 h-3" /> User
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.plan === 'PRO' ? (
                      <div>
                        <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full text-xs font-bold">
                          <Sparkles className="w-3 h-3" /> PRO
                        </span>
                        {u.isTrial && (
                          <span className="ml-1 inline-flex items-center bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full text-xs font-bold" title={t(`Masa trial ${TRIAL_DAYS} hari, belum membayar`, `${TRIAL_DAYS}-day trial, not paid yet`)}>
                            TRIAL
                          </span>
                        )}
                        {u.planExpiresAt && (
                          <p className={`text-xs mt-0.5 ${new Date(u.planExpiresAt) < new Date() ? 'text-red-400' : 'text-slate-500'}`}>
                            {new Date(u.planExpiresAt) < new Date() ? t('Kedaluwarsa', 'Expired') : t('s/d', 'until')} {new Date(u.planExpiresAt).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-700 text-slate-400 border border-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">
                        FREE
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.plan === 'FREE' ? (
                        <button
                          onClick={() => handleSetPro(u)}
                          className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 rounded-lg transition-colors font-medium"
                          title={t('Set PRO 1 bulan', 'Set PRO for 1 month')}
                        >
                          Set PRO
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetFree(u)}
                          className="text-xs px-2 py-1 bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600 rounded-lg transition-colors"
                          title={t('Cabut PRO', 'Revoke PRO')}
                        >
                          {t('Cabut', 'Revoke')}
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title={t('Hapus', 'Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('Belum ada user', 'No users yet')}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
