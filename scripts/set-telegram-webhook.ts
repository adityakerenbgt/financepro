// Mendaftarkan webhook bot ke Telegram dari terminal (alternatif tombol "Aktifkan bot" di Panel Admin).
// Jalankan HANYA setelah aplikasi ter-deploy (URL publik HTTPS):  npm run telegram:webhook -- https://domain-anda
// Cukup TELEGRAM_BOT_TOKEN: rahasia webhook dibuat otomatis, menu perintah & deskripsi bot ikut diatur.
// Tanpa argumen URL: hanya menampilkan status.
async function main() {
  const { getBotStatus, activateBot } = await import('../lib/telegramSetup');
  const base = process.argv[2] || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  if (!process.argv[2]) {
    const s = await getBotStatus(base);
    console.log(JSON.stringify(s, null, 2));
    return;
  }
  const r = await activateBot(base);
  console.log(r.ok ? 'Bot aktif: webhook, menu perintah, dan deskripsi sudah diatur.' : `Gagal: ${r.message}`);
  if (!r.ok) process.exit(1);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });

export {};
