'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react';
import { useLang } from '@/app/i18n';
import { useSetupData } from '../../hooks';
import {
  ImportFileError, MAX_DATA_ROWS, TEMPLATE_HEADER, buildTemplateCsv, downloadText, guessMapping, parseImportFile, toCsv,
  type FieldKey, type Mapping, type ParsedFile,
} from '@/lib/importFile';
import type { RowResult } from '@/lib/importer';

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done';
type TypeMode = 'column' | 'allExpense' | 'allIncome' | 'sign';

interface PreviewData {
  results: RowResult[];
  summary: { total: number; ok: number; duplicates: number; invalid: number; created: number };
  newCategories: string[];
  newAccounts: string[];
}

const BATCH_TARGET = 400; // baris per permintaan (server menerima maks. 500)

export default function ImportPage() {
  const { t, tError } = useLang();
  const { accounts } = useSetupData();
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ date: -1, type: -1, amount: -1, category: -1, account: -1, description: -1, note: -1 });
  const [typeMode, setTypeMode] = useState<TypeMode>('column');
  const [defaultAccount, setDefaultAccount] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [final, setFinal] = useState<Map<number, RowResult>>(new Map());
  const [pendingBatches, setPendingBatches] = useState<RowResult[][]>([]);

  const headers = parsed?.matrix[0] ?? [];

  // Baris mentah untuk API (nomor baris = nomor baris di file, header = baris 1).
  const rawRows = useMemo(() => {
    if (!parsed) return [];
    const cell = (r: string[], i: number) => (i >= 0 ? r[i] ?? '' : '');
    return parsed.matrix.slice(1).map((r, i) => ({
      ref: i + 2,
      date: cell(r, mapping.date), type: typeMode === 'column' ? cell(r, mapping.type) : '', amount: cell(r, mapping.amount),
      category: cell(r, mapping.category), account: cell(r, mapping.account), description: cell(r, mapping.description), note: cell(r, mapping.note),
    }));
  }, [parsed, mapping, typeMode]);

  const reset = () => {
    setStep('upload'); setParsed(null); setPreview(null); setFinal(new Map()); setPendingBatches([]); setError(''); setFileName('');
    setProgress({ done: 0, total: 0 });
    if (fileInput.current) fileInput.current.value = '';
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const p = await parseImportFile(file);
      const g = guessMapping(p.matrix[0]);
      setParsed(p);
      setFileName(file.name);
      setMapping(g);
      setTypeMode(g.type >= 0 ? 'column' : 'sign');
      setDefaultAccount('');
      setStep('map');
    } catch (e) {
      setError(e instanceof ImportFileError ? e.message : t('File tidak bisa dibaca.', 'The file could not be read.'));
    } finally {
      setBusy(false);
    }
  };

  const post = async (rows: unknown[], dryRun: boolean) => {
    const res = await fetch('/api/import/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, typeMode, defaultAccount: defaultAccount || undefined, dryRun }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan server');
    return data as PreviewData;
  };

  const mappingError = (() => {
    if (mapping.date < 0) return t('Pilih kolom Tanggal.', 'Choose the Date column.');
    if (mapping.amount < 0) return t('Pilih kolom Nominal.', 'Choose the Amount column.');
    if (typeMode === 'column' && mapping.type < 0) return t('Pilih kolom Jenis, atau pilih cara lain menentukan jenis.', 'Choose the Type column, or pick another way to set the type.');
    if (mapping.account < 0 && !defaultAccount) return t('Pilih kolom Rekening atau rekening bawaan.', 'Choose the Account column or a default account.');
    return '';
  })();

  const runPreview = async () => {
    setError('');
    setBusy(true);
    try {
      setPreview(await post(rawRows, true));
      setStep('preview');
    } catch (e: any) {
      setError(tError(e.message));
    } finally {
      setBusy(false);
    }
  };

  // Baris kembar (kunci sama) selalu dalam satu batch; kalau terpecah, kembaran kedua salah dianggap duplikat.
  const makeBatches = (oks: RowResult[]): RowResult[][] => {
    const groups = new Map<string, RowResult[]>();
    for (const r of oks) { const k = r.key ?? `ref:${r.ref}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }
    const batches: RowResult[][] = [];
    let cur: RowResult[] = [];
    for (const g of groups.values()) {
      if (cur.length && cur.length + g.length > BATCH_TARGET) { batches.push(cur); cur = []; }
      cur.push(...g);
    }
    if (cur.length) batches.push(cur);
    return batches;
  };

  const runBatches = async (batches: RowResult[][], total: number, startDone: number, acc: Map<number, RowResult>) => {
    setStep('importing');
    setBusy(true);
    setError('');
    let done = startDone;
    const byRef = new Map(rawRows.map(r => [r.ref, r]));
    for (let b = 0; b < batches.length; b++) {
      try {
        const out = await post(batches[b].map(r => byRef.get(r.ref)!), false);
        out.results.forEach(r => acc.set(r.ref, r));
        done += batches[b].length;
        setProgress({ done, total });
      } catch (e: any) {
        setFinal(new Map(acc));
        setPendingBatches(batches.slice(b));
        setError(`${tError(e.message)} — ${t('impor dihentikan. Aman untuk dilanjutkan: baris yang sudah masuk tidak akan digandakan.', 'import stopped. It is safe to resume: rows already imported will not be duplicated.')}`);
        setBusy(false);
        return;
      }
    }
    setFinal(new Map(acc));
    setPendingBatches([]);
    setBusy(false);
    setStep('done');
  };

  const startImport = async () => {
    if (!preview) return;
    const oks = preview.results.filter(r => r.status === 'ok');
    const acc = new Map<number, RowResult>();
    preview.results.filter(r => r.status !== 'ok').forEach(r => acc.set(r.ref, r));
    const batches = makeBatches(oks);
    setProgress({ done: 0, total: oks.length });
    await runBatches(batches, oks.length, 0, acc);
  };

  const resume = async () => {
    if (!preview) return;
    const total = preview.results.filter(r => r.status === 'ok').length;
    await runBatches(pendingBatches, total, [...final.values()].filter(r => r.status === 'created').length, new Map(final));
  };

  const counts = useMemo(() => {
    const all = [...final.values()];
    return {
      created: all.filter(r => r.status === 'created').length,
      duplicates: all.filter(r => r.status === 'duplicate').length,
      failed: all.filter(r => r.status === 'invalid').length,
    };
  }, [final]);
  const problemRows = useMemo(() => [...final.values()].filter(r => r.status !== 'created').sort((a, b) => a.ref - b.ref), [final]);

  const downloadProblems = () => {
    const byRef = new Map(rawRows.map(r => [r.ref, r]));
    const lines = problemRows.map(p => {
      const r = byRef.get(p.ref)!;
      return [r.date, r.type, r.amount, r.category, r.account, r.description, r.note, p.error ?? ''];
    });
    downloadText('baris-bermasalah.csv', toCsv([[...TEMPLATE_HEADER, 'Alasan'], ...lines]));
  };

  const field = 'input-field w-full text-sm';
  const colOptions = (
    <>
      <option value={-1}>{t('(tidak ada)', '(none)')}</option>
      {headers.map((h, i) => <option key={i} value={i}>{`${i + 1}. ${h || t('(kolom kosong)', '(empty column)')}`}</option>)}
    </>
  );
  const colSelect = (key: FieldKey, label: string, required = false) => (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-400"> *</span>}</label>
      <select className={field} value={mapping[key]} onChange={e => setMapping({ ...mapping, [key]: Number(e.target.value) })}>{colOptions}</select>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('Import Transaksi', 'Import Transactions')}</h1>
        <p className="text-sm text-slate-400">{t('Impor riwayat dari file CSV atau Excel (.xlsx). Nominal berupa Rupiah bulat tanpa desimal.', 'Import history from a CSV or Excel (.xlsx) file. Amounts are whole Rupiah, no decimals.')}</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {step === 'upload' && (
        <div className="card space-y-4">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
            className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center"
          >
            <FileSpreadsheet className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-300 mb-1">{t('Tarik file ke sini atau pilih dari komputer', 'Drag a file here or choose from your computer')}</p>
            <p className="text-xs text-slate-500 mb-4">{t(`.csv atau .xlsx · maks. 2 MB · maks. ${MAX_DATA_ROWS.toLocaleString('id-ID')} baris`, `.csv or .xlsx · max 2 MB · max ${MAX_DATA_ROWS.toLocaleString('en-US')} rows`)}</p>
            <input ref={fileInput} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
            <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="btn-primary inline-flex items-center gap-2">
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {t('Pilih File', 'Choose File')}
            </button>
          </div>
          <button type="button" onClick={() => downloadText('template-impor-transaksi.csv', buildTemplateCsv())} className="inline-flex items-center gap-2 text-sm text-blue-400 hover:underline">
            <Download className="w-4 h-4" /> {t('Unduh template CSV', 'Download CSV template')}
          </button>
          <ul className="text-xs text-slate-500 space-y-1 list-disc pl-5">
            <li>{t('Tanggal: DD/MM/YYYY atau YYYY-MM-DD (hari lebih dulu).', 'Date: DD/MM/YYYY or YYYY-MM-DD (day first).')}</li>
            <li>{t('Nominal: 25000, 25.000 atau Rp25.000. Nilai berdesimal (mis. 25.000,50) ditolak.', 'Amount: 25000, 25.000 or Rp25.000. Decimal values (e.g. 25.000,50) are rejected.')}</li>
            <li>{t('Baris yang sama persis dengan transaksi yang sudah ada dilewati, jadi aman mengimpor ulang file yang sama.', 'Rows identical to existing transactions are skipped, so re-importing the same file is safe.')}</li>
          </ul>
        </div>
      )}

      {step === 'map' && parsed && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">{fileName}</span> · {(parsed.matrix.length - 1).toLocaleString('id-ID')} {t('baris data', 'data rows')}
              {parsed.sheetName ? ` · ${t('lembar', 'sheet')} "${parsed.sheetName}"` : ''}
            </p>
            <button onClick={reset} className="text-xs text-slate-400 hover:text-white">{t('Ganti file', 'Change file')}</button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {colSelect('date', t('Tanggal', 'Date'), true)}
            {colSelect('amount', t('Nominal', 'Amount'), true)}
            {colSelect('category', t('Kategori (kosong = Lainnya)', 'Category (empty = Lainnya)'))}
            {colSelect('description', t('Deskripsi', 'Description'))}
            {colSelect('account', t('Rekening', 'Account'))}
            <div>
              <label className="form-label">{t('Rekening bawaan (bila kolom kosong)', 'Default account (when the column is empty)')}</label>
              <select className={field} value={defaultAccount} onChange={e => setDefaultAccount(e.target.value)}>
                <option value="">{t('(tidak ada)', '(none)')}</option>
                {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            {colSelect('note', t('Catatan', 'Note'))}
          </div>

          <fieldset className="space-y-2">
            <legend className="form-label">{t('Cara menentukan Pemasukan / Pengeluaran', 'How to set Income / Expense')}</legend>
            {([
              ['column', t('Dari kolom Jenis', 'From a Type column')],
              ['sign', t('Dari tanda nominal (+ pemasukan, − pengeluaran)', 'From the amount sign (+ income, − expense)')],
              ['allExpense', t('Semua baris adalah Pengeluaran', 'All rows are Expenses')],
              ['allIncome', t('Semua baris adalah Pemasukan', 'All rows are Income')],
            ] as [TypeMode, string][]).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="radio" name="typeMode" checked={typeMode === v} onChange={() => setTypeMode(v)} className="accent-blue-600" /> {label}
              </label>
            ))}
            {typeMode === 'column' && <div className="max-w-xs">{colSelect('type', t('Kolom Jenis', 'Type column'), true)}</div>}
          </fieldset>

          <div className="overflow-x-auto">
            <p className="text-xs text-slate-500 mb-1">{t('Contoh isi file (5 baris pertama):', 'File sample (first 5 rows):')}</p>
            <table className="text-xs text-slate-300 border border-slate-700 rounded">
              <tbody>
                {parsed.matrix.slice(0, 6).map((r, i) => (
                  <tr key={i} className={i === 0 ? 'bg-slate-700/50 font-semibold' : ''}>{r.map((c, j) => <td key={j} className="px-2 py-1 border-b border-slate-800 whitespace-nowrap max-w-[10rem] truncate">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          {mappingError && <p className="text-sm text-yellow-300">{mappingError}</p>}
          <div className="flex gap-2">
            <button onClick={reset} className="btn-secondary">{t('Batal', 'Cancel')}</button>
            <button onClick={runPreview} disabled={!!mappingError || busy} className="btn-primary flex items-center gap-2">
              {busy && <RefreshCw className="w-4 h-4 animate-spin" />} {t('Periksa & Pratinjau', 'Check & Preview')}
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="card space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3"><p className="text-2xl font-bold text-green-400">{preview.summary.ok.toLocaleString('id-ID')}</p><p className="text-xs text-green-300">{t('Siap diimpor', 'Ready to import')}</p></div>
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3"><p className="text-2xl font-bold text-yellow-400">{preview.summary.duplicates.toLocaleString('id-ID')}</p><p className="text-xs text-yellow-300">{t('Duplikat (dilewati)', 'Duplicates (skipped)')}</p></div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3"><p className="text-2xl font-bold text-red-400">{preview.summary.invalid.toLocaleString('id-ID')}</p><p className="text-xs text-red-300">{t('Bermasalah (dilewati)', 'Invalid (skipped)')}</p></div>
          </div>

          {(preview.newAccounts.length > 0 || preview.newCategories.length > 0) && (
            <div className="text-sm text-slate-300 rounded-lg border border-slate-700 p-3 space-y-1">
              {preview.newAccounts.length > 0 && <p>{t('Rekening baru akan dibuat', 'New accounts will be created')}: <span className="text-white">{preview.newAccounts.join(', ')}</span></p>}
              {preview.newCategories.length > 0 && <p>{t('Kategori baru akan dibuat', 'New categories will be created')}: <span className="text-white">{preview.newCategories.join(', ')}</span></p>}
            </div>
          )}

          {preview.results.some(r => r.status !== 'ok') && (
            <div>
              <p className="text-sm font-semibold text-white mb-1">{t('Baris yang akan dilewati', 'Rows that will be skipped')}</p>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-700">
                <table className="w-full text-xs">
                  <tbody>
                    {preview.results.filter(r => r.status !== 'ok').slice(0, 200).map(r => (
                      <tr key={r.ref} className="border-b border-slate-800">
                        <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{t('Baris', 'Row')} {r.ref}</td>
                        <td className={`px-3 py-1.5 whitespace-nowrap ${r.status === 'duplicate' ? 'text-yellow-400' : 'text-red-400'}`}>{r.status === 'duplicate' ? t('Duplikat', 'Duplicate') : t('Salah', 'Invalid')}</td>
                        <td className="px-3 py-1.5 text-slate-300">{r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.results.filter(r => r.status !== 'ok').length > 200 && <p className="text-xs text-slate-500 mt-1">{t('Menampilkan 200 pertama.', 'Showing the first 200.')}</p>}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStep('map')} className="btn-secondary">{t('Kembali', 'Back')}</button>
            <button onClick={startImport} disabled={preview.summary.ok === 0 || busy} className="btn-primary">
              {t(`Impor ${preview.summary.ok.toLocaleString('id-ID')} Transaksi`, `Import ${preview.summary.ok.toLocaleString('en-US')} Transactions`)}
            </button>
          </div>
          {preview.summary.ok === 0 && <p className="text-sm text-slate-500">{t('Tidak ada baris yang bisa diimpor. Periksa pemetaan kolom atau perbaiki file.', 'No importable rows. Check the column mapping or fix the file.')}</p>}
        </div>
      )}

      {step === 'importing' && (
        <div className="card space-y-3">
          <p className="text-white font-semibold flex items-center gap-2">{busy && <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />} {t('Mengimpor...', 'Importing...')}</p>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
          <p className="text-xs text-slate-400">{progress.done.toLocaleString('id-ID')} / {progress.total.toLocaleString('id-ID')}</p>
          {!busy && pendingBatches.length > 0 && (
            <div className="flex gap-2">
              <button onClick={resume} className="btn-primary">{t('Lanjutkan Impor', 'Resume Import')}</button>
              <button onClick={() => setStep('done')} className="btn-secondary">{t('Selesai di sini', 'Stop here')}</button>
            </div>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            {counts.failed === 0 && pendingBatches.length === 0 ? <CheckCircle2 className="w-6 h-6 text-green-400" /> : <AlertTriangle className="w-6 h-6 text-yellow-400" />}
            <h2 className="text-lg font-bold text-white">{t('Impor selesai', 'Import finished')}</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3"><p className="text-2xl font-bold text-green-400">{counts.created.toLocaleString('id-ID')}</p><p className="text-xs text-green-300">{t('Berhasil', 'Imported')}</p></div>
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3"><p className="text-2xl font-bold text-yellow-400">{counts.duplicates.toLocaleString('id-ID')}</p><p className="text-xs text-yellow-300">{t('Duplikat', 'Duplicates')}</p></div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3"><p className="text-2xl font-bold text-red-400">{counts.failed.toLocaleString('id-ID')}</p><p className="text-xs text-red-300">{t('Gagal', 'Failed')}</p></div>
          </div>
          {problemRows.length > 0 && (
            <div className="space-y-2">
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-700">
                <table className="w-full text-xs"><tbody>
                  {problemRows.slice(0, 200).map(r => (
                    <tr key={r.ref} className="border-b border-slate-800">
                      <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{t('Baris', 'Row')} {r.ref}</td>
                      <td className={`px-3 py-1.5 whitespace-nowrap ${r.status === 'duplicate' ? 'text-yellow-400' : 'text-red-400'}`}>{r.status === 'duplicate' ? t('Duplikat', 'Duplicate') : t('Gagal', 'Failed')}</td>
                      <td className="px-3 py-1.5 text-slate-300">{r.error}</td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
              <button onClick={downloadProblems} className="inline-flex items-center gap-2 text-sm text-blue-400 hover:underline"><Download className="w-4 h-4" />{t('Unduh baris bermasalah (bisa diperbaiki lalu diimpor ulang)', 'Download problem rows (fix them and import again)')}</button>
            </div>
          )}
          <div className="flex gap-2">
            <Link href="/transactions" className="btn-primary">{t('Lihat Transaksi', 'View Transactions')}</Link>
            <button onClick={reset} className="btn-secondary">{t('Impor File Lain', 'Import Another File')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
