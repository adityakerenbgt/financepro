'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bot, RefreshCw } from 'lucide-react';
import { useLang } from '@/app/i18n';

interface Status {
  configured: boolean;
  tokenValid?: boolean;
  bot?: { username: string; name: string };
  webhook?: { url: string; matches: boolean; pending: number; lastError: string | null };
  expectedUrl: string;
  httpsReady: boolean;
  error?: string;
}

// Kartu Panel Admin: status bot Telegram + satu tombol untuk mengaktifkan (webhook, menu perintah, deskripsi otomatis).
export default function TelegramBotCard() {
  const { t } = useLang();
  const [s, setS] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/telegram');
      if (r.ok) setS(await r.json());
    } catch { /* abaikan */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (action: 'activate' | 'deactivate') => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || t('Gagal', 'Failed'));
      setS(d.status);
      setMsg({ ok: true, text: action === 'activate' ? t('Bot aktif. Menu perintah dan deskripsi sudah diatur otomatis.', 'Bot is active. Commands menu and description were set automatically.') : t('Webhook dimatikan.', 'Webhook disabled.') });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally { setBusy(false); }
  };

  if (!s) return null;
  const active = s.webhook?.matches;

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="w-5 h-5 text-sky-400" />
        <h2 className="font-semibold text-white">{t('Bot Telegram', 'Telegram Bot')}</h2>
        {s.bot && <span className="text-xs text-slate-400">@{s.bot.username}</span>}
        {s.tokenValid && (
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${active ? 'bg-emerald-500/20 text-emerald-300' : s.httpsReady ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'}`}>
            {active ? t('Aktif', 'Active') : s.httpsReady ? t('Belum aktif', 'Not active') : t('Mode lokal', 'Local mode')}
          </span>
        )}
      </div>

      {!s.configured && (
        <p className="text-sm text-slate-400">
          {t('Isi satu variabel: ', 'Set one variable: ')}<code className="text-slate-200">TELEGRAM_BOT_TOKEN</code>{t(' (dari @BotFather) di pengaturan hosting (Vercel) lalu muat ulang halaman ini. Selebihnya otomatis.', ' (from @BotFather) in your hosting settings (Vercel), then reload this page. Everything else is automatic.')}
        </p>
      )}
      {s.configured && s.tokenValid === false && <p className="text-sm text-red-300">{t('Token ditolak Telegram. Periksa nilainya (atau buat ulang lewat @BotFather).', 'Token rejected by Telegram. Check the value (or regenerate via @BotFather).')}</p>}

      {s.tokenValid && (
        <>
          {!s.httpsReady && (
            <p className="text-xs text-slate-400">{t('Mode lokal: bot tetap bisa dipakai lewat ', 'Local mode: the bot still works via ')}<code className="text-slate-200">npm run telegram:poll</code>{t(' (kartu ini hanya menampilkan status webhook). Webhook baru bisa diaktifkan setelah aplikasi di-deploy ke alamat HTTPS publik.', ' (this card only shows webhook status). The webhook can be activated once the app is deployed to a public HTTPS address.')}</p>
          )}
          {s.webhook && s.webhook.url && !s.webhook.matches && (
            <p className="text-xs text-amber-300">{t('Webhook mengarah ke alamat lain. Klik Aktifkan untuk memperbarui.', 'Webhook points elsewhere. Click Activate to update it.')}</p>
          )}
          {s.webhook?.lastError && <p className="text-xs text-red-300">{t('Galat terakhir dari Telegram: ', 'Last error from Telegram: ')}{s.webhook.lastError}</p>}
          {active && <p className="text-xs text-slate-500">{t('Pesan menunggu: ', 'Pending updates: ')}{s.webhook!.pending}</p>}
          <div className="flex gap-2">
            <button onClick={() => act('activate')} disabled={busy || !s.httpsReady} className="btn-primary text-sm disabled:opacity-50">
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : active ? t('Perbarui', 'Refresh') : t('Aktifkan bot', 'Activate bot')}
            </button>
            {s.webhook?.url && <button onClick={() => act('deactivate')} disabled={busy} className="btn-secondary text-sm">{t('Matikan', 'Disable')}</button>}
          </div>
        </>
      )}
      {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.text}</p>}
    </div>
  );
}
