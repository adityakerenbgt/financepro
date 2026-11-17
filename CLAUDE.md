# FinancePro — Project Context untuk Claude

## Apa ini?
Aplikasi manajemen keuangan pribadi berbasis web (Next.js 15) dengan sistem multi-user dan freemium model. Target pasar: publik umum Indonesia.

## Tech Stack
- **Frontend**: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js runtime)
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma
- **Auth**: JWT (jsonwebtoken) di API routes, jose di middleware (Edge Runtime)
- **Password**: bcryptjs
- **Hosting (rencana)**: Vercel (app) + Supabase (DB)
- **Domain**: financepro.grexion.ai

## Owner / Admin
- **Username**: `virgiangalang`
- **Password**: (jangan ditulis di repo; seed membaca `SEED_ADMIN_PASSWORD` dari env)
- **Role**: ADMIN
- **Plan**: PRO (otomatis karena ADMIN)

## Struktur User & Plan
```
UserRole: ADMIN | USER
UserPlan: FREE | PRO
```
- ADMIN = full access semua fitur tanpa cek plan
- PRO = akses semua fitur
- FREE = Dashboard & ekspor bulan berjalan, Transaksi (+ impor), 1 Rekening, Telegram bot basic
- Trial = akun baru PRO selama 3 hari (`TRIAL_DAYS`, `lib/plans.ts`); plan efektif dihitung `lib/plan.ts` dari DB, bukan JWT

## Fitur yang sudah ada
- [x] Login / Logout
- [x] Public signup (/register) — akun baru otomatis PRO selama `TRIAL_DAYS` hari (3 hari, `lib/plans.ts`), lalu kembali FREE
- [x] Multi-user dengan data isolation per userId
- [x] Admin Panel (/dashboard/admin) — kelola user, set PRO/FREE
- [x] Dashboard (chart, summary)
- [x] Transaksi (CRUD)
- [x] Rekening (CRUD)
- [x] Nabung & Investasi — PRO only
- [x] Hutang & Piutang — PRO only
- [x] Aset — PRO only
- [x] Goals — PRO only
- [x] Budget — PRO only
- [x] Laporan (daily/weekly/monthly) — PRO only
- [x] Transfer antar rekening
- [x] Settings (UserProfile)
- [x] Telegram bot (basic commands)
- [x] ProGate component (lock screen untuk fitur PRO)
- [x] Upgrade page (/dashboard/upgrade)
- [x] Sidebar: badge PRO/FREE, upgrade banner
- [x] Dark/Light mode
- [x] PWA
- [x] Landing page, legal (ToS/Privacy), onboarding, reset password & email (Resend)
- [x] Payment request (bukti transfer, admin approve), cron auto-downgrade, pengingat perpanjangan
- [x] Transaksi berulang (PRO), Net Worth, preset rentang tanggal, impor CSV/Excel, ekspor CSV/Excel/PDF
- [x] Admin analytics, email digest mingguan, notifikasi email admin
- [x] Bot Telegram multi-user aman (tautan /link KODE, webhook secret)
- [x] Sentry (opsional, tanpa PII), header keamanan, rate limiting
- [x] ID/EN + mata uang tampilan

## Yang BELUM ada (roadmap)
- [ ] Deploy produksi (Vercel + domain) dan `setWebhook` Telegram — butuh akun owner (lihat `DEPLOYMENT.md`)
- [ ] Playwright (UI) + CI GitHub Actions dengan DB uji terpisah
- [ ] Utang teknis: ESLint, Zod, `$transaction` untuk saldo, N+1, rapikan `/api/admin/users`
- [ ] Chatbot pencatat (T-OWN-6) dan foto nota via Gemini (T-OWN-8, butuh API key)
- [ ] Midtrans (pembayaran otomatis) — rencana nanti
- Status rinci: `FinancePro_Intern_Handover/docs/07_TASK_BACKLOG.md` dan `BUG_LOG.md`

## Penting: Auth Architecture
- Middleware (`middleware.ts`) jalan di **Edge Runtime** → pakai `jose` (bukan `jsonwebtoken`)
- API routes jalan di **Node.js runtime** → pakai `jsonwebtoken`
- JWT payload: `{ userId, username, role, plan }`
- Cookie: `auth-token` (httpOnly, 30 hari)
- Helper: `getUserFromRequest(req)` di `lib/auth.ts`

## Penting: Multi-user Data Isolation
Semua Prisma query WAJIB filter `where: { userId: user.userId }`. Compound unique constraints:
- Category: `@@unique([userId, name])`
- Account: `@@unique([userId, name])`
- Budget: `@@unique([userId, month, categoryId])`
- Debt: `@@unique([userId, debtName])`
- Asset: `@@unique([userId, instrumentName])`
- Goal: `@@unique([userId, goalName])`

## Database
- Provider: Supabase (PostgreSQL)
- `DATABASE_URL` ada di `.env` dan `.env.local` (jangan di-commit)
- Untuk schema changes: `npx prisma db push`
- Untuk seed: `npx prisma db seed`

## Environment Variables
Wajib: `DATABASE_URL`, `JWT_SECRET` (≥ 32 karakter; app gagal start bila kosong), `NEXT_PUBLIC_BASE_URL`. Produksi juga: `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`/`EMAIL_FROM`, `UPSTASH_REDIS_REST_*`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `ADMIN_NOTIFY_EMAIL`. Opsional: `TELEGRAM_BOT_TOKEN`/`TELEGRAM_WEBHOOK_SECRET`/`TELEGRAM_BOT_USERNAME`, `SENTRY_*`. Daftar + penjelasan: `.env.local.example`. Jangan pernah menulis nilai rahasia di repo atau chat.

## Cara jalankan
```bash
npm install && npm run db:push && npm run db:seed   # sekali
npm run dev                                          # http://localhost:3000
npm run test:unit                                    # unit test
npm run test:api                                     # integrasi (butuh dev server berjalan)
```
Catatan Windows: hentikan dev server sebelum `prisma db push`/`generate` (file DLL terkunci). Skrip uji DB: `DB_POOL_SIZE=2 npx tsx --env-file=.env --env-file=.env.local skrip.ts`.

## Git & Deploy
- Repo: GitHub private `adityakerenbgt/financepro`
- Deploy target: Vercel + Supabase; panduan di `DEPLOYMENT.md`
- DNS: CNAME `financepro` → `cname.vercel-dns.com`

## Pricing Plan
- FREE: Rp 0 (transaksi, dashboard bulan ini, 1 rekening, Telegram basic)
- PRO Monthly: Rp 29.000/bulan
- PRO Yearly: Rp 249.000/tahun
- Payment: WhatsApp admin (tanpa data rekening di app) → transfer → unggah bukti → admin approve (Midtrans rencana nanti)

## Konvensi Kode
- Semua API route: `getUserFromRequest(req)` → return 401 jika null
- Pro-only API: `requirePro(req)` dari `lib/auth.ts` (plan dibaca dari DB); route baru wajib punya skenario di `tests/api/`
- Error route: `console.error('[nama]', error.message)` + respons generik 500 (jangan bocorkan `error.message` ke klien)
- Halaman Pro: early return `if (role !== 'ADMIN' && plan !== 'PRO') return <ProGate feature="..." />`
- Format Rupiah: `Rp${Math.round(n).toLocaleString('id-ID')}`
