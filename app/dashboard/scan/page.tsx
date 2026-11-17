'use client';

/* eslint-disable @next/next/no-img-element -- pratinjau dari blob: lokal, tidak cocok untuk next/image */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, CheckCircle2, RefreshCw, ScanLine, ShieldCheck } from 'lucide-react';
import { useLang } from '@/app/i18n';
import { useAuth } from '../../auth-context';
import { useSetupData } from '../../hooks';
import { RpInput } from '../../components/RpInput';
import ProGate from '../../components/ProGate';

interface Draft { date: string; amount: number; merchant: string; category: string; items: { name: string; amount: number }[] }
type Step = 'pick' | 'reading' | 'review' | 'saving' | 'done';

const MAX_SIDE = 1600;

// Perkecil foto di browser (sisi terpanjang 1600 px, JPEG): upload lebih cepat dan metadata EXIF (mis. lokasi) terbuang.
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    if (blob) return blob;
  } catch { /* format tak didukung browser: kirim apa adanya bila cukup kecil */ }
  return file;
}

export default function ScanReceiptPage() {
  const { t, tError } = useLang();
  const { plan, role } = useAuth();
  const isPro = role === 'ADMIN' || plan === 'PRO';
  const { categories, accounts, loading } = useSetupData();
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('pick');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState('');
  const [items, setItems] = useState<Draft['items']>([]);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [includeItems, setIncludeItems] = useState(false);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  // Akun baru belum punya rekening: bawaannya "Tunai" (dibuat otomatis saat transaksi pertama disimpan).
  useEffect(() => { if (!account && !loading) setAccount(accounts[0]?.name ?? 'Tunai'); }, [accounts, account, loading]);

  if (!isPro) return <ProGate feature={t('Scan Nota', 'Receipt Scan')} />;

  const expenseCats = categories.filter((c) => c.type !== 'income').map((c) => c.name);
  const catOptions = category && !expenseCats.includes(category) ? [category, ...expenseCats] : expenseCats;

  const reset = () => {
    setStep('pick'); setError(''); setWarnings([]); setItems([]); setIncludeItems(false);
    setPreviewUrl(''); setDate(''); setAmount(''); setDescription(''); setCategory('');
    if (fileInput.current) fileInput.current.value = '';
  };

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setStep('reading');
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const blob = await shrink(file);
      const fd = new FormData();
      fd.append('file', blob, 'nota.jpg');
      const res = await fetch('/api/receipts/scan', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('Gagal membaca nota', 'Failed to read receipt'));
      const d: Draft = data.draft;
      setDate(d.date); setAmount(String(d.amount)); setDescription(d.merchant); setCategory(d.category); setItems(d.items);
      setWarnings(data.warnings ?? []);
      setStep('review');
    } catch (e: any) {
      setError(tError(e.message));
      setStep('pick');
    }
  };

  const save = async () => {
    setError('');
    const n = parseInt(amount || '0', 10);
    if (!date || !n || !description.trim() || !category || !account) {
      setError(t('Lengkapi tanggal, nominal, deskripsi, kategori, dan rekening.', 'Fill in date, amount, description, category, and account.'));
      return;
    }
    setStep('saving');
    try {
      const note = includeItems && items.length ? items.map((i) => `${i.name} ${i.amount.toLocaleString('id-ID')}`).join('; ').slice(0, 500) : undefined;
      const res = await fetch('/api/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, category, description: description.trim(), account, type: 'Pengeluaran', amount: n, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('Gagal menyimpan', 'Failed to save'));
      setStep('done');
    } catch (e: any) {
      setError(tError(e.message));
      setStep('review');
    }
  };

  const warnText: Record<string, [string, string]> = {
    date_missing: ['Tanggal tidak terbaca; diisi hari ini. Periksa kembali.', 'Date not found; set to today. Please check.'],
    date_invalid: ['Tanggal pada nota tampak tidak wajar; diisi hari ini. Periksa kembali.', 'The receipt date looks off; set to today. Please check.'],
    category_unknown: ['Kategori tidak yakin; pilih yang sesuai.', 'Category unsure; please choose one.'],
    amount_rounded: ['Nominal dibulatkan ke Rupiah.', 'Amount rounded to whole Rupiah.'],
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ScanLine className="w-6 h-6 text-blue-400" />{t('Scan Nota', 'Scan Receipt')}</h1>
        <p className="text-sm text-slate-400 mt-1">{t('Foto nota, periksa hasilnya, lalu simpan sebagai pengeluaran.', 'Photograph a receipt, check the result, then save it as an expense.')}</p>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-800/50 border border-slate-700 rounded-lg p-3">
        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
        <span>{t('Foto dikirim ke Google Gemini hanya untuk dibaca, lalu dibuang: FinancePro tidak menyimpan fotonya. Pastikan nota tidak memuat data sensitif lain.', 'The photo is sent to Google Gemini only to be read, then discarded: FinancePro does not store it. Make sure the receipt has no other sensitive data.')}</span>
      </div>

      {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</div>}

      {(step === 'pick' || step === 'reading') && (
        <div className="card text-center space-y-4 py-8">
          {step === 'reading' ? (
            <>
              {previewUrl && <img src={previewUrl} alt="" className="mx-auto max-h-48 rounded-lg opacity-70" />}
              <div className="flex items-center justify-center gap-2 text-slate-300"><RefreshCw className="w-4 h-4 animate-spin" />{t('Membaca nota...', 'Reading receipt...')}</div>
            </>
          ) : (
            <>
              <Camera className="w-10 h-10 mx-auto text-slate-500" />
              <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
              <button onClick={() => fileInput.current?.click()} className="btn-primary">{t('Ambil / pilih foto nota', 'Take / choose receipt photo')}</button>
              <p className="text-xs text-slate-500">{t('JPEG, PNG, atau WebP. Foto lurus dan terang hasilnya paling akurat.', 'JPEG, PNG or WebP. Straight, well-lit photos work best.')}</p>
            </>
          )}
        </div>
      )}

      {(step === 'review' || step === 'saving') && (
        <div className="card space-y-4">
          {previewUrl && <img src={previewUrl} alt="" className="max-h-40 rounded-lg mx-auto" />}
          {warnings.length > 0 && (
            <ul className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-1">
              {warnings.map((w) => <li key={w}>• {warnText[w] ? t(...warnText[w]) : w}</li>)}
            </ul>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">{t('Tanggal', 'Date')}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div>
              <label className="form-label">{t('Total', 'Total')}</label>
              <RpInput value={amount} onChange={setAmount} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">{t('Deskripsi (toko)', 'Description (merchant)')}</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} className="input-field w-full text-sm" />
            </div>
            <div>
              <label className="form-label">{t('Kategori', 'Category')}</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field w-full text-sm">
                <option value="">{t('Pilih kategori', 'Choose category')}</option>
                {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">{t('Rekening', 'Account')}</label>
              {accounts.length > 0 ? (
                <select value={account} onChange={(e) => setAccount(e.target.value)} className="input-field w-full text-sm" disabled={loading}>
                  {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              ) : (
                <input type="text" value={account} onChange={(e) => setAccount(e.target.value)} maxLength={50} className="input-field w-full text-sm" />
              )}
            </div>
          </div>
          {items.length > 0 && (
            <div className="text-xs text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeItems} onChange={(e) => setIncludeItems(e.target.checked)} className="accent-blue-600" />
                {t(`Tambahkan ${items.length} rincian barang ke catatan`, `Add ${items.length} line items to the note`)}
              </label>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={save} disabled={step === 'saving'} className="btn-primary flex-1">{step === 'saving' ? t('Menyimpan...', 'Saving...') : t('Simpan transaksi', 'Save transaction')}</button>
            <button onClick={reset} disabled={step === 'saving'} className="btn-secondary">{t('Ulangi', 'Retry')}</button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card text-center space-y-4 py-8">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
          <p className="text-white font-medium">{t('Transaksi tersimpan.', 'Transaction saved.')}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="btn-primary">{t('Scan nota lain', 'Scan another')}</button>
            <Link href="/transactions" className="btn-secondary">{t('Lihat transaksi', 'View transactions')}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
