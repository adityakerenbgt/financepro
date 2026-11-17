// Menjalankan bot Telegram secara LOKAL dengan long polling (tanpa webhook, tanpa URL publik / tunnel).
// Hanya untuk pengembangan/uji:  npm run telegram:poll   (hentikan dengan Ctrl+C)
// Memakai TELEGRAM_BOT_TOKEN dan DATABASE_URL dari env. Jangan dijalankan bersamaan dengan webhook produksi untuk bot yang sama:
// Telegram hanya mengizinkan satu cara menerima update, jadi skrip ini MENGHAPUS webhook bot ini lebih dulu.
// Koneksi database kecil: server dev + bot berbagi batas koneksi pooler Supabase.
process.env.DB_POOL_SIZE ??= '2';

async function main() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN belum diisi di .env / .env.local');
    process.exit(1);
  }
  const { createBot } = await import('../lib/telegramBot'); // diimpor setelah env di atas siap
  const bot = createBot();
  const me = await bot.api.getMe().catch((e: unknown) => {
    console.error('Token ditolak Telegram (salah/dicabut?):', e instanceof Error ? e.message : e);
    process.exit(1);
  });
  await bot.api.deleteWebhook({ drop_pending_updates: true });
  console.log(`Bot @${me.username} berjalan (long polling). Buka Telegram, cari @${me.username}, lalu kirim /start. Ctrl+C untuk berhenti.`);

  process.once('SIGINT', () => bot.stop());
  process.once('SIGTERM', () => bot.stop());
  await bot.start({ allowed_updates: ['message', 'callback_query'], onStart: () => console.log('Menunggu pesan...') });
}

main().catch((e) => {
  console.error('Bot berhenti:', e instanceof Error ? e.message : e);
  process.exit(1);
});

export {};
