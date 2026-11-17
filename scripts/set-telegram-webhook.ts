// Mendaftarkan webhook bot ke Telegram. Jalankan HANYA setelah aplikasi ter-deploy (URL publik HTTPS):
//   npm run telegram:webhook -- https://domain-anda.com
// Memakai TELEGRAM_BOT_TOKEN dan TELEGRAM_WEBHOOK_SECRET dari env. Tanpa argumen URL: hanya menampilkan info webhook.
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = process.argv[2];

async function call(method: string, body?: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}),
  });
  return res.json();
}

(async () => {
  if (!token) { console.error('TELEGRAM_BOT_TOKEN belum diset'); process.exit(1); }
  if (!base) {
    const info: any = await call('getWebhookInfo');
    console.log('URL:', info.result?.url || '(belum diset)', '| pending:', info.result?.pending_update_count, '| error:', info.result?.last_error_message || '-');
    return;
  }
  if (!secret || !/^[A-Za-z0-9_-]{16,256}$/.test(secret)) { console.error('TELEGRAM_WEBHOOK_SECRET wajib diset (16+ karakter A-Z a-z 0-9 _ -)'); process.exit(1); }
  if (!/^https:\/\//.test(base)) { console.error('URL harus HTTPS'); process.exit(1); }
  const r: any = await call('setWebhook', { url: `${base.replace(/\/+$/, '')}/api/webhook`, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: true });
  console.log(r.ok ? 'Webhook terdaftar.' : `Gagal: ${r.description}`);
})();
