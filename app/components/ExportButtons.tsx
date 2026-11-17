'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { useLang } from '@/app/i18n';

// Tombol unduh CSV / Excel / PDF. `params` = query string tambahan (filter aktif atau bulan laporan).
export default function ExportButtons({ kind, params, disabled }: { kind: 'transactions' | 'monthly'; params: Record<string, string>; disabled?: boolean }) {
  const { t } = useLang();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const download = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setBusy(format); setErr('');
    try {
      const q = new URLSearchParams({ kind, format });
      for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
      const res = await fetch(`/api/export?${q.toString()}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.code === 'PRO_REQUIRED' ? t('Ekspor laporan bulanan khusus PRO', 'Monthly report export is PRO only') : d.error || t('Gagal mengunduh', 'Download failed'));
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || `export.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (res.headers.get('X-Export-Truncated')) setErr(t('Hanya 20.000 baris pertama yang diekspor; persempit rentang tanggal.', 'Only the first 20,000 rows were exported; narrow the date range.'));
    } catch (e: any) {
      setErr(e.message || t('Gagal mengunduh', 'Download failed'));
    } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Download className="w-4 h-4 text-slate-400" />
      {(['csv', 'xlsx', 'pdf'] as const).map(f => (
        <button key={f} type="button" disabled={disabled || busy !== null} onClick={() => download(f)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50">
          {busy === f ? '...' : f === 'xlsx' ? 'Excel' : f.toUpperCase()}
        </button>
      ))}
      {err && <span className="text-xs text-amber-400">{err}</span>}
    </div>
  );
}
