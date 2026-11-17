# FinancePro

Aplikasi manajemen keuangan pribadi untuk pengguna Indonesia: multi-user, freemium (FREE / PRO), UI Indonesia & English.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · Prisma 5 · PostgreSQL (Supabase) · grammY (Telegram) · Resend (email) · Sentry (opsional).

## Fitur

| Paket | Isi |
|---|---|
| **FREE** | Dashboard bulan berjalan, transaksi tak terbatas (+ impor CSV/Excel, ekspor bulan berjalan), 1 rekening, bot Telegram dasar (`/add`, `/transaksi`) |
| **PRO** | Rekening tak terbatas, transaksi berulang, nabung & investasi, utang & piutang, aset, budget, goals, laporan harian/mingguan/bulanan, Net Worth, rentang tanggal bebas, ekspor CSV/Excel/PDF, **Scan Nota** (foto → transaksi; OCR di perangkat, atau AI gratis Groq/OpenRouter/Mistral/Gemini), perintah bot lengkap, **bot mencatat dari kalimat bebas/foto nota** |
| **Trial** | Akun baru otomatis PRO selama 3 hari |
| **Admin** | Kelola user & plan, setujui pembayaran, analytics (MRR, konversi), email notifikasi pembayaran baru |

Pembayaran manual: user chat admin via WhatsApp → transfer → unggah bukti → admin approve (tidak ada data rekening di aplikasi). Email: reset password, welcome, pengingat perpanjangan, digest mingguan.

## Mulai cepat (lokal)

```bash
npm install
cp .env.local.example .env.local      # lalu isi DATABASE_URL dan JWT_SECRET (wajib)
npm run db:push                       # buat tabel
npm run db:seed                       # akun admin dari SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD (di .env)
npm run dev                           # http://localhost:3000
```

Variabel lain bersifat opsional di lokal (email dilewati, rate limit pakai memori, Sentry/Telegram nonaktif). Daftar lengkap dan arti tiap variabel: `.env.local.example`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` / `build` / `start` | Development / build produksi / jalankan build |
| `npm run lint` | ESLint (`--max-warnings=0`); `npm run format` = Prettier |
| `npm run test:unit` | Unit test (node:test) |
| `npm run test:bot` | Uji chatbot Telegram di dalam proses (API Telegram & AI tiruan; butuh DB) |
| `npm run test:api` | Skenario integrasi API (butuh `npm run dev` berjalan; memakai DB di `.env`). Uji Scan Nota dengan Gemini tiruan: lihat `tests/api/receipt.test.ts` |
| `npm run db:push` · `db:seed` · `db:studio` | Skema, seed admin, Prisma Studio |
| `npm run storage:setup` | Membuat bucket privat bukti pembayaran (Supabase Storage) |
| `npm run telegram:poll` | Menjalankan bot Telegram lokal (long polling, tanpa URL publik) untuk uji |
| `npm run telegram:webhook -- https://domain` | Mendaftarkan webhook Telegram dari terminal (atau tombol "Aktifkan bot" di Panel Admin) |

## Dokumentasi

- `ARCHITECTURE.md` — arsitektur & keputusan teknis
- `DEPLOYMENT.md` — deploy Vercel + Supabase + domain + Telegram + cron
- `CLAUDE.md` — konteks proyek untuk asisten AI
- `FinancePro_Intern_Handover/docs/` — paket handover (status, backlog, keamanan, konvensi, `BUG_LOG.md`)

## Keamanan singkat

JWT di cookie httpOnly; plan dibaca dari database pada setiap request (bukan dari token); semua query difilter per `userId`; rate limit login/register/reset; header keamanan (CSP, HSTS, dll.); cron dan webhook Telegram ditutup dengan rahasia; bukti pembayaran di bucket privat dengan signed URL 60 detik. Jangan commit `.env*`. Rinciannya di `FinancePro_Intern_Handover/docs/11_SECURITY.md`.
