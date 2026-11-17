# Panduan Deploy — FinancePro

Target: **Vercel** (aplikasi + cron) + **Supabase** (PostgreSQL + Storage) + domain sendiri. Langkah yang membutuhkan akun pemilik ditandai 🔑.

## 0. Sebelum mulai

- [ ] `npm run build` dan `npm run test:unit` hijau di lokal.
- [ ] Ganti kredensial yang pernah tertempel di chat/git: password database, `SUPABASE_SERVICE_ROLE_KEY`, password admin lama, token bot Telegram bila pernah terlihat publik.
- [ ] Repo GitHub **private**.

## 1. Database & Storage (Supabase) 🔑

1. Buat project; pilih region terdekat pengguna.
2. Connect → **Session pooler** (port 5432, host `*.pooler.supabase.com`) → salin sebagai `DATABASE_URL`. Di Vercel serverless pakai pooler, bukan koneksi langsung. Atur `DB_POOL_SIZE` (mis. `5`) bila perlu.
3. Dari lokal (satu kali, ke DB produksi): `npm run db:push` lalu `npm run db:seed` (isi `SEED_ADMIN_USERNAME/PASSWORD` sementara di `.env`, kosongkan lagi sesudahnya).
4. Project Settings → API: salin `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`, lalu `npm run storage:setup` (membuat bucket privat `payment-proofs`).
5. Aktifkan backup (Database → Backups) dan catat kebijakan retensinya.

## 2. Layanan pendukung 🔑

| Layanan | Untuk | Variabel |
|---|---|---|
| Resend | Email (reset password, welcome, pengingat, digest, notifikasi admin) | `RESEND_API_KEY`, `EMAIL_FROM` — verifikasi domain (SPF + DKIM) dulu |
| Upstash Redis | Rate limit yang bekerja di serverless | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Sentry (opsional) | Pelacakan error tanpa data pribadi | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`; untuk source map: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` |
| Google AI Studio (opsional) | Scan Nota lebih akurat (PRO). Tanpa ini Scan Nota tetap jalan (OCR di perangkat) | `RECEIPT_PROVIDER=gemini` + `GEMINI_API_KEY` (opsional `GEMINI_MODEL`); batasi kuota/biaya di Google Cloud |
| BotFather (opsional) | Bot Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` |

## 3. Vercel 🔑

1. Import repo GitHub → framework Next.js (otomatis).
2. Isi **Environment Variables** (Production). Wajib: `DATABASE_URL`, `JWT_SECRET` (≥ 32 karakter acak, **baru**, bukan dari lokal), `NEXT_PUBLIC_BASE_URL` (`https://domain-anda`), `CRON_SECRET` (acak, baru), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `ADMIN_NOTIFY_EMAIL`, plus layanan di tabel atas. Acak: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. Deploy. Cron di `vercel.json` terdaftar otomatis dan memakai `CRON_SECRET`:

| Cron | Jadwal (UTC) | WIB |
|---|---|---|
| `/api/cron/expire-plans` | 17:00 harian | 00:00 |
| `/api/cron/recurring` | 17:05 harian | 00:05 |
| `/api/cron/renewal-reminders` | 02:00 harian | 09:00 |
| `/api/cron/weekly-digest` | 01:00 Sen–Rab | 08:00 |

Catatan: paket Vercel Hobby membatasi cron (frekuensi dan durasi fungsi); digest mingguan ≈ 230 email per jendela Sen–Rab.

## 4. Domain 🔑

Tambahkan domain di Vercel → Settings → Domains, lalu buat DNS CNAME (mis. `financepro` → `cname.vercel-dns.com`) di penyedia DNS. HTTPS otomatis; cookie `secure` aktif di produksi.

## 5. Telegram (setelah deploy) 🔑

```bash
npm run telegram:webhook -- https://domain-anda        # mendaftarkan webhook + secret
npm run telegram:webhook                               # cek status
```

User menautkan akun lewat **Pengaturan → Hubungkan Telegram** lalu `/link KODE` ke bot.

## 6. Uji asap di produksi

- [ ] Landing & login terbuka; cookie `auth-token` bertanda Secure + HttpOnly.
- [ ] Daftar akun baru → email welcome tiba → login → tambah transaksi → dashboard.
- [ ] Lupa password → email tiba → reset berhasil.
- [ ] Akun FREE ditolak di fitur PRO; admin ubah ke PRO → terbuka.
- [ ] Unggah bukti bayar → admin menerima email → approve → user PRO.
- [ ] `curl -i https://domain-anda/api/cron/expire-plans` → 401; dengan `Authorization: Bearer $CRON_SECRET` → 200.
- [ ] Cek header: `curl -I https://domain-anda/login` memuat CSP, HSTS, X-Frame-Options.
- [ ] Vercel → Cron Jobs: keempat cron terdaftar; jalankan manual sekali.
- [ ] (Bila Sentry aktif) picu error uji dan pastikan event masuk tanpa email/password.

## 7. Rollback

Vercel → Deployments → pilih deployment sebelumnya → **Promote to Production** (instan, tanpa build ulang). Perubahan skema database tidak ikut di-rollback: buat perubahan skema yang kompatibel mundur (tambah kolom, jangan hapus langsung).

## 8. Operasional

- Setelah mengganti env di Vercel, lakukan redeploy.
- Pantau: Vercel Logs, Sentry, dashboard Supabase (koneksi/pool), kuota Resend.
- `npm audit --omit=dev` berkala; upgrade Next.js 15.x patch saat tersedia.
