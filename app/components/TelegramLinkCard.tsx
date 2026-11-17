'use client';

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { useLang } from '@/app/i18n';

export default function TelegramLinkCard() {
  const { t } = useLang();
  const [linked, setLinked] = useState<boolean | null>(null);
  const [bot, setBot] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const r = await fetch('/api/telegram/link');
      const d = await r.json();
      if (r.ok) { setLinked(!!d.linked); setBot(d.botUsername ?? null); }
    } catch { /* abaikan */ }
  };
  useEffect(() => { load(); }, []);

  const connect = async () => {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/telegram/link', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'error');
      setCode(d.code); if (d.botUsername) setBot(d.botUsername);
    } catch (e: any) { setErr(e.message || t('Gagal membuat kode', 'Failed to create code')); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/telegram/link', { method: 'DELETE' });
      if (!r.ok) throw new Error();
      setLinked(false); setCode(null);
    } catch { setErr(t('Gagal memutuskan', 'Failed to disconnect')); }
    finally { setBusy(false); }
  };

  if (linked === null) return null;

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-5 h-5 text-sky-400" />
        <h2 className="font-semibold text-white">{t('Hubungkan Telegram', 'Connect Telegram')}</h2>
      </div>
      {linked ? (
        <>
          <p className="text-sm text-emerald-400">{t('✓ Telegram terhubung. Kirim /help ke bot untuk melihat perintah.', '✓ Telegram connected. Send /help to the bot to see commands.')}</p>
          <button onClick={disconnect} disabled={busy} className="btn-secondary text-sm">{t('Putuskan', 'Disconnect')}</button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-400">{t('Catat transaksi lewat chat Telegram. Buat kode, lalu kirim ke bot.', 'Log transactions via Telegram chat. Create a code, then send it to the bot.')}</p>
          {code ? (
            <div className="rounded-lg bg-slate-800 p-3 text-sm text-slate-200">
              <div>{t('Kirim pesan ini ke bot', 'Send this message to the bot')}{bot ? <> <b>@{bot}</b></> : null}:</div>
              <div className="mt-1 font-mono text-lg text-white select-all">/link {code}</div>
              <div className="mt-1 text-xs text-slate-500">{t('Berlaku 10 menit, sekali pakai.', 'Valid for 10 minutes, single use.')}</div>
            </div>
          ) : null}
          <button onClick={connect} disabled={busy} className="btn-primary text-sm">{code ? t('Buat kode baru', 'New code') : t('Buat kode tautan', 'Create link code')}</button>
        </>
      )}
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}
