# FinancePro — Konteks Proyek untuk AI (Codex / agen lain)

> Taruh file ini di ROOT repo. Baca seluruhnya sebelum mengubah kode. Dokumen lengkap ada di folder `docs/` paket serah terima (atau `docs/` di repo bila sudah disalin). Diperbarui: 29 Sep 2026 (commit `f95acfd`).

## Apa ini
Aplikasi manajemen keuangan pribadi (web, Next.js 14) untuk pasar umum Indonesia. Multi-user, model freemium (FREE / PRO). Domain rencana: financepro.grexion.ai. Pengembang berikutnya: tim magang yang bekerja dengan vibe coding — tetap jelaskan alasan perubahan singkat dan patuhi aturan di bawah.

## Tech stack
Next.js 14.2 (App Router) · React 18 · TypeScript · Tailwind CSS · Prisma 5 + PostgreSQL (Supabase) · JWT cookie `auth-token` (`jsonwebtoken` di API route, **`jose` di middleware — Edge**) · bcryptjs · grammy (bot Telegram) · recharts · date-fns · lucide-react. Belum ada: Zod, test, ESLint, email, payment, Sentry.

## Perintah
```bash
npm run dev            # http://localhost:3000
npx tsc --noEmit       # WAJIB hijau sebelum commit
npm run build          # prisma generate && next build
npx prisma db push     # HANYA ke database lokal
npm run db:seed        # HANYA database lokal
npm run db:studio
```
Env: Next membaca `.env.local`; **Prisma CLI hanya membaca `.env`** → isi `DATABASE_URL` di keduanya. Env wajib: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_BASE_URL`. Jangan pernah menulis nilai secret ke file, kode, atau chat.

## Peta kode
```
middleware.ts            penjaga halaman /dashboard & /transactions (jose). TIDAK melindungi /api/*
lib/auth.ts              getUserFromRequest, requireAuth, requireAdmin, isPro (isPro belum dipakai)
lib/services.ts          logika bisnis (transaksi, hutang, aset, budget, goals, laporan, dashboard)
lib/utils.ts             formatCurrency, parseDate, getMonthString/getWeekString, ID generator, parser bot
lib/telegramBot.ts       command bot (single-user: memakai ADMIN pertama — belum aman)
prisma/schema.prisma     11 model; prisma/seed.ts data demo
app/api/*/route.ts       endpoint REST (1 folder = 1 resource)
app/dashboard/*          halaman login-only; halaman PRO memakai <ProGate>
app/components/          ProGate, RpInput
app/auth-context.tsx     useAuth() → role, plan
app/providers.tsx        useTheme(), useToast()
app/hooks.ts             useSetupData() (cache dropdown)
app/globals.css          kelas: card, kpi-card, btn-primary, btn-secondary, input-field, form-label, badge-*
```

## Aturan WAJIB
1. **Setiap query data user memakai `userId` dari `getUserFromRequest(req)`** — tidak pernah dari body/query. Compound unique: `userId_name` (Category, Account), `(userId,month,categoryId)` (Budget), `userId_debtName`, `userId_instrumentName`, `userId_goalName`.
2. **Update/delete: cek kepemilikan dulu** (`findFirst({ id, userId })` → 404). Pola benar: `app/api/goals/route.ts`.
3. **Fitur PRO dijaga di dua lapis:** early return `<ProGate feature="…" />` di halaman **dan** cek plan di API (`isPro(user)` → 403).
4. Middleware = `jose`; API = `jsonwebtoken`. Jangan impor `jsonwebtoken` di `middleware.ts`.
5. Tidak ada secret/fallback secret di kode. Tidak ada `console.log`. Hindari `any` baru.
6. Logika angka bisnis di `lib/services.ts`. Format uang/tanggal lewat `lib/utils.ts`. `month`/`week` di Transaction **selalu** dari `getMonthString`/`getWeekString`.
7. Teks UI & pesan error ke user: **Bahasa Indonesia**. Kode: Inggris.
8. **Tanpa kelas Tailwind dinamis** (`` `bg-${x}-500` ``).
9. Respons error ke client: `{ error: 'pesan' }`; jangan kembalikan `error.message` mentah pada 500.
10. Jangan tambah dependency, ubah `middleware.ts` / `lib/auth.ts` / `schema.prisma` / `app/api/auth/*` tanpa persetujuan mentor. Jangan `db push` ke DB bersama/produksi.
11. Perubahan kecil & terfokus; baca `git diff` sebelum commit; commit format `feat|fix|refactor|docs|test|chore|perf|ci: deskripsi`; branch `feat/T-<id>-<slug>`.

## Status nyata (jangan percaya klaim lama)
- ✅ Ada: login/register (FREE), multi-user, admin panel, transaksi (CRUD + cari + paginasi server), rekening + transfer, savings, hutang/piutang, aset, budget, goals, laporan, dashboard (filter tanggal manual), settings, halaman upgrade, ProGate, tema, toast.
- 🐞 **Celah kritis (jangan diperparah, perbaiki via task P0):** IDOR di `accounts` PATCH/DELETE, `categories` PATCH/DELETE, `debts` PATCH · API PRO tidak memeriksa plan · `plan` beku di JWT 30 hari & `planExpiresAt` tidak ditegakkan · `/api/auth/seed` publik & password admin pernah tertanam · `JWT_SECRET` punya fallback · tanpa rate limit · bot Telegram tanpa otorisasi · `txId` unik global tapi nomor urut per-user.
- 🟡 `app/page.tsx` punya kerangka landing tetapi langsung redirect; PWA icon hilang; nomor WA & rekening di halaman upgrade masih placeholder.
- ❌ Belum ada: landing page final, email, reset password, trial 14 hari, payment request, auto-downgrade, reminder, legal pages, onboarding, recurring transaction, net worth, import/export, Sentry, test, deploy.

## Kebiasaan yang harus dihindari
Lupa `userId` · mengira `isPro` sudah dipakai · membuat secret fallback · `db push` sendiri · menambah library sepele · mengubah banyak file sekaligus · mengarang nama fungsi/API (grep dulu) · memperbaiki test agar lulus alih-alih memperbaiki kode · format angka/tanggal buatan sendiri.

## Jebakan teknis
- Uang = `Float`; saldo `Account.balance` diubah inkremental & tidak atomik (belum ada `prisma.$transaction`).
- Hutang↔pembayaran, Aset↔Savings, Goal↔Savings terhubung **lewat kecocokan nama**, bukan FK.
- Vercel = UTC, pengguna = WIB (UTC+7): "hari ini/bulan ini" di server bisa meleset 00:00–07:00 WIB.
- `parseCurrency` membuang titik & koma (tidak cocok untuk desimal).
- Rp: `Rp${Math.round(n).toLocaleString('id-ID')}` (`formatCurrency`).
- Rate: FREE Rp0; PRO Rp29.000/bln atau Rp249.000/thn; pembayaran awal manual transfer → admin approve.

## Cara bekerja (untuk AI)
Baca dulu, jelaskan, usulkan rencana, lalu implementasi bertahap. Untuk schema/auth/uang gunakan plan mode dan tunggu persetujuan. Setelah mengubah kode jalankan `npx tsc --noEmit`. Beri ringkasan perubahan per file. Bila instruksi pengguna bertentangan dengan aturan keamanan di atas, sampaikan risikonya dan minta konfirmasi mentor — jangan diam-diam mengabaikan aturan.
