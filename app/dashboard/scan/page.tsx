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
import { readReceiptOnDevice } from '@/lib/receiptOcr';

interface Draft { date: string; amount: number; merchant: string; category: string; items: { name: string; amount: number }[] }
type Step = 'pick' | 'reading' | 'review' | 'saving' | 'done';
type Provider = string; // 'ondevice' atau penyedia di server (gemini, groq, openrouter, mistral, openai)

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

  const [provider, setProvider] = useState<Provider>('ondevice');
  const [providerLabel, setProviderLabel] = useState('');
  const [fellBack, setFellBack] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [ocrProgress, setOcrProgress] = useState<{ percent: number; stage: 'download' | 'read' } | null>(null);
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

  // Pembaca yang aktif ditentukan server (env RECEIPT_PROVIDER): "ondevice" (bawaan) atau "gemini".
  useEffect(() => {
    if (!isPro) return;
    fetch('/api/receipts/scan').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.provider && d.provider !== 'ondevice') { setProvider(d.provider); setProviderLabel(d.label || d.provider); } }).catch(() => {});
  }, [isPro]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  // Akun baru belum punya rekening: bawaannya "Tunai" (dibuat otomatis saat transaksi pertama disimpan).
  useEffect(() => { if (!account && !loading) setAccount(accounts[0]?.name ?? 'Tunai'); }, [accounts, account, loading]);

  if (!isPro) return <ProGate feature={t('Scan Nota', 'Receipt Scan')} />;

  const expenseCats = categories.filter((c) => c.type !== 'income').map((c) => c.name);
  const catOptions = category && !expenseCats.includes(category) ? [category, ...expenseCats] : expenseCats;

  const reset = () => {
    setStep('pick'); setError(''); setWarnings([]); setItems([]); setIncludeItems(false);
    setOcrText(''); setOcrProgress(null); setFellBack(false);
    setPreviewUrl(''); setDate(''); setAmount(''); setDescription(''); setCategory('');
    if (fileInput.current) fileInput.current.value = '';
  };

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setStep('reading');
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const blob = await shrink(file);
      let d: Draft;
      let warns: string[];
      let serverDraft: { draft: Draft; warnings: string[] } | null = null;
      if (provider !== 'ondevice') {
        const fd = new FormData();
        fd.append('file', blob, 'nota.jpg');
        const res = await fetch('/api/receipts/scan', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok) serverDraft = { draft: data.draft, warnings: data.warnings ?? [] };
        // Penyedia AI gagal/tidak aktif/kena batas gratis (502/503/504): jatuh ke pembacaan di perangkat. Kesalahan lain ditampilkan.
        else if (![502, 503, 504].includes(res.status)) throw new Error(data.error || t('Gagal membaca nota', 'Failed to read receipt'));
        else setFellBack(true);
      }
      if (serverDraft) {
        d = serverDraft.draft; warns = serverDraft.warnings;
      } else {
        const cats = expenseCats.includes('Lainnya') ? expenseCats : [...expenseCats, 'Lainnya'];
        const r = await readReceiptOnDevice(blob, cats, (percent, stage) => setOcrProgress({ percent, stage }));
        d = r.draft; warns = r.warnings; setOcrText(r.text);
      }
      setDate(d.date); setAmount(d.amount ? String(d.amount) : ''); setDescription(d.merchant); setCategory(d.category); setItems(d.items);
      setWarnings(warns);
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
    amount_missing: ['Total tidak terbaca; isi manual.', 'Total not found; please enter it manually.'],
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ScanLine className="w-6 h-6 text-blue-400" />{t('Scan Nota', 'Scan Receipt')}</h1>
        <p className="text-sm text-slate-400 mt-1">{t('Foto nota, periksa hasilnya, lalu simpan sebagai pengeluaran.', 'Photograph a receipt, check the result, then save it as an expense.')}</p>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-800/50 border border-slate-700 rounded-lg p-3">
        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
        <span>{provider !== 'ondevice'
          ? t(`Foto dikirim ke ${providerLabel} (layanan AI pihak ketiga) hanya untuk dibaca, lalu dibuang: FinancePro tidak menyimpan fotonya. Pastikan nota tidak memuat data sensitif lain.`, `The photo is sent to ${providerLabel} (a third-party AI service) only to be read, then discarded: FinancePro does not store it. Make sure the receipt has no other sensitive data.`)
          : t('Nota dibaca langsung di perangkatmu: foto tidak dikirim ke server mana pun. Hasil bacaan bisa kurang akurat, jadi periksa sebelum menyimpan.', 'The receipt is read on your device: the photo is not sent to any server. Results may be less accurate, so please check before saving.')}</span>
      </div>

      {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</div>}

      {(step === 'pick' || step === 'reading') && (
        <div className="card text-center space-y-4 py-8">
          {step === 'reading' ? (
            <>
              {previewUrl && <img src={previewUrl} alt="" className="mx-auto max-h-48 rounded-lg opacity-70" />}
              <div className="flex items-center justify-center gap-2 text-slate-300">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {provider === 'ondevice' && ocrProgress
                  ? `${ocrProgress.stage === 'download' ? t('Menyiapkan pembaca (sekali di awal)', 'Preparing reader (first time only)') : t('Membaca nota', 'Reading receipt')}... ${ocrProgress.percent}%`
                  : t('Membaca nota...', 'Reading receipt...')}
              </div>
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
          {fellBack && (
            <p className="text-xs text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded-lg p-3">
              {t('Pembaca AI sedang tidak tersedia, jadi nota dibaca di perangkatmu (kurang akurat). Periksa hasilnya dengan teliti.', 'The AI reader is unavailable, so the receipt was read on your device (less accurate). Please check the result carefully.')}
            </p>
          )}
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
          {ocrText && (
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer">{t('Teks yang terbaca', 'Recognised text')}</summary>
              <pre className="mt-2 whitespace-pre-wrap max-h-40 overflow-auto bg-slate-900/60 rounded p-2">{ocrText}</pre>
            </details>
          )}
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
