# 09 — Setup Lokal

Target: aplikasi berjalan di `http://localhost:3000` dengan database milikmu sendiri dalam ±20 menit.

## 1. Prasyarat

| Alat | Versi | Cek |
|---|---|---|
| Node.js | **20 LTS** (pengembang utama memakai Node 24 tanpa masalah) | `node --version` |
| npm | ikut Node | `npm --version` |
| Git | terbaru | `git --version` |
| Editor | VS Code / Cursor | |
| Database | salah satu: **Supabase (gratis)** atau **Postgres lokal via Docker** | lihat §2 |

Versi terpasang di proyek: Next 14.2.35 · React 18.3.1 · Prisma 5.22 · TypeScript 5.

## 2. Siapkan database (pilih satu)

> **Jangan pernah memakai database bersama/produksi untuk pengembangan.** Tiap orang punya database sendiri.

### Opsi A — Supabase (gratis)
1. Daftar di supabase.com → *New project* (catat password database).
2. *Project Settings → Database → Connection string → URI* (mode **Direct connection**, port `5432`).
3. Ganti `[YOUR-PASSWORD]` dengan password tadi. Contoh bentuk: `postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres`.

### Opsi B — Postgres lokal (Docker Desktop)
```bash
docker run --name fp-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=financepro -p 5432:5432 -d postgres:16
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/financepro"
```
Berhenti/mulai lagi: `docker stop fp-pg` / `docker start fp-pg`.

## 3. Instal & konfigurasi

```bash
git clone <URL-repo-private>
cd financepro
npm install            # otomatis menjalankan `prisma generate`
```

Buat file env (Windows PowerShell: `Copy-Item`; macOS/Linux/Git Bash: `cp`):

```bash
cp templates/.env.example .env.local
cp templates/.env.example .env
```

Isi minimal **kedua** file:

```env
DATABASE_URL="<connection string dari langkah 2>"
JWT_SECRET="<string acak ≥ 32 karakter>"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

Buat `JWT_SECRET` acak:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠ **Kenapa dua file?** `next dev` membaca `.env.local`, tetapi **Prisma CLI (`db push`, `db:seed`, `studio`) hanya membaca `.env`**. Jika hanya membuat `.env.local`, perintah Prisma gagal dengan `Environment variable not found: DATABASE_URL`. (Petunjuk lama di `README.md`/`DEPLOYMENT.md` melewatkan hal ini.) Keduanya sudah di `.gitignore` — **jangan pernah di-commit**.

## 4. Buat tabel & data awal

```bash
npx prisma db push        # membuat semua tabel sesuai schema.prisma
npm run db:seed           # akun admin + kategori + data demo
```

Seed membuat akun **ADMIN** dan data demo. Catatan keamanan:
- Sampai task **P0-3** selesai, `prisma/seed.ts` memakai username/password yang tertulis di file. Owner sudah menggantinya di produksi; pakai hanya untuk DB **lokal**. Setelah P0-3, isi `SEED_ADMIN_USERNAME` & `SEED_ADMIN_PASSWORD` di `.env`.
- Kredensial untuk lingkunganmu diberikan mentor secara terpisah (jangan ditulis di chat/AI/git).

## 5. Jalankan

```bash
npm run dev
```

Buka http://localhost:3000. Sampai landing page selesai, `/` mengalihkan ke `/login`.

## 6. Uji cepat (smoke test 5 menit)

1. Login sebagai admin (kredensial dari mentor).
2. Buka **Transaksi** → tambah 1 pengeluaran (kategori & rekening bebas; akan dibuat otomatis).
3. Buka **Dashboard** → angka & grafik berubah.
4. Logout → buka `/register` → daftar akun uji **FREE** → login.
5. Coba buka **Budget** → harus terkunci (`ProGate`).
6. Login admin → **Admin Panel** → jadikan akun uji PRO → login ulang sebagai akun uji → Budget terbuka. *(Login ulang diperlukan sampai P0-4 selesai — plan tersimpan di token.)*

Jika 6 langkah ini lolos, lingkunganmu benar.

## 7. Perintah harian

| Perintah | Guna |
|---|---|
| `npm run dev` | Server pengembangan (hot reload) |
| `npx tsc --noEmit` | Cek tipe (jalankan sebelum commit) |
| `npm run build` | Build produksi (jalankan sebelum PR besar / task landing page) |
| `npm run db:studio` | GUI melihat/mengedit data (`localhost:5555`) |
| `npx prisma db push` | Sinkronkan schema ke DB **lokal** |
| `npm run db:seed` | Isi data demo (DB lokal saja) |

`npm run lint` belum bisa dipakai (belum ada konfigurasi ESLint — T-DEBT-1). Belum ada `npm test` (T-DEBT-7).

## 8. Env var

Lihat `templates/.env.example` untuk daftar lengkap. Ringkas:

| Variabel | Wajib sekarang? | Guna |
|---|---|---|
| `DATABASE_URL` | ✅ | Koneksi Postgres |
| `JWT_SECRET` | ✅ (kode saat ini punya fallback berbahaya; P0-3 membuatnya wajib) | Tanda tangan JWT |
| `NEXT_PUBLIC_BASE_URL` | ✅ | URL aplikasi |
| `TELEGRAM_BOT_TOKEN` | opsional | Hanya jika mengerjakan bot |
| `SEED_ADMIN_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `UPSTASH_*`, `SUPABASE_*`, `SENTRY_DSN` | belum | Diperkenalkan oleh task terkait |

Variabel berawalan `NEXT_PUBLIC_` **terlihat oleh semua pengunjung** — jangan isi secret.

## 9. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| `Environment variable not found: DATABASE_URL` (saat `prisma …`) | Buat juga `.env` (bukan hanya `.env.local`) |
| `P1001: Can't reach database server` | DB mati (Docker `docker start fp-pg`), string koneksi salah, atau jaringan memblokir port 5432. Supabase: pakai *Direct connection* untuk `db push` |
| Supabase pooler (port 6543) + Prisma error prepared statement | Tambahkan `?pgbouncer=true&connection_limit=1` untuk runtime; `db push` tetap butuh koneksi direct |
| `Module '"@prisma/client"' has no exported member …` | Jalankan `npx prisma generate` |
| Login berhasil tapi kembali ke `/login` | Cookie tidak tersimpan: cek `JWT_SECRET` sama di `.env` & `.env.local`, hapus cookie `auth-token`, restart `npm run dev` |
| `Unauthorized` di semua API | Cookie kedaluwarsa → login ulang |
| Port 3000 terpakai | `npm run dev -- -p 3001` (dan ubah `NEXT_PUBLIC_BASE_URL`) |
| Setelah `git pull` ada error tipe Prisma | `npm install` lalu `npx prisma generate` lalu `npx prisma db push` |
| Ingin mulai dari database kosong | `npx prisma db push --force-reset` (**menghapus semua data lokal**) lalu seed |
| Windows: `cp` tidak dikenal | Pakai Git Bash, atau `Copy-Item` di PowerShell |

## 10. Menjalankan Telegram bot secara lokal (opsional, hanya setelah T-BOT-1 atau untuk eksperimen)

Bot memakai webhook, jadi butuh URL publik: `ngrok http 3000`, lalu `setWebhook` ke `https://<ngrok>/api/webhook`. **Gunakan bot uji milik sendiri** (buat lewat @BotFather), bukan bot produksi, dan jangan tinggalkan webhook aktif — bot saat ini belum punya otorisasi (lihat `03_ARCHITECTURE.md` § 7).
