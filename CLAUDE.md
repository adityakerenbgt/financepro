# FinancePro — Project Context untuk Claude

## Apa ini?
Aplikasi manajemen keuangan pribadi berbasis web (Next.js 14) dengan sistem multi-user dan freemium model. Target pasar: publik umum Indonesia.

## Tech Stack
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
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
- FREE = hanya Dashboard, Transaksi, 1 Rekening, Telegram bot basic

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

## Yang BELUM ada (roadmap)
- [ ] Landing page publik (/) — BLOCKER untuk launch
- [ ] Email system (password reset, welcome, notifikasi)
- [ ] Payment request system (upload bukti transfer, admin approve)
- [ ] Subscription expiry auto-downgrade (cron job)
- [ ] Renewal reminder email
- [ ] Legal pages (ToS, Privacy Policy)
- [ ] Onboarding flow user baru
- [ ] Recurring transactions
- [ ] Net Worth di dashboard
- [ ] Search & pagination transaksi
- [ ] Quick date ranges di dashboard
- [ ] Import CSV/Excel
- [ ] Export PDF/Excel
- [ ] Error tracking (Sentry)
- [ ] Rate limiting pada /register dan /login
- [ ] Admin analytics (MRR, active users, conversion)
- [ ] Email digest mingguan

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

## Environment Variables yang dibutuhkan
```
DATABASE_URL=postgresql://...supabase.co.../postgres
JWT_SECRET=<min 32 karakter acak, WAJIB; app gagal start bila kosong>
NEXT_PUBLIC_BASE_URL=http://localhost:3000 (dev) / https://financepro.grexion.ai (prod)
TELEGRAM_BOT_TOKEN=your_token (opsional)
```

## Cara jalankan
```bash
cd D:/FinancePro
npm run dev
# App berjalan di http://localhost:3000
```

## Git & Deploy
- Repo: belum di-push ke GitHub remote (sudah `git init` dan initial commit)
- Deploy target: Vercel
- DNS: CNAME `financepro` → `cname.vercel-dns.com` di cPanel grexion.ai

## Pricing Plan
- FREE: Rp 0 (transaksi, dashboard bulan ini, 1 rekening, Telegram basic)
- PRO Monthly: Rp 29.000/bulan
- PRO Yearly: Rp 249.000/tahun
- Payment: manual bank transfer → WhatsApp → admin approve (Midtrans rencana nanti)

## Konvensi Kode
- Semua API route: `getUserFromRequest(req)` → return 401 jika null
- Pro-only API: tambahkan cek `isPro(user)` dari `lib/auth.ts`
- Halaman Pro: early return `if (role !== 'ADMIN' && plan !== 'PRO') return <ProGate feature="..." />`
- Format Rupiah: `Rp${Math.round(n).toLocaleString('id-ID')}`
