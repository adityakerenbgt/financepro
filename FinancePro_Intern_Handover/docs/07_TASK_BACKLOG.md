# 07 — Backlog Tugas

Daftar kerja lengkap, diurutkan sesuai timeline magang 6 bulan (dokumen timeline 6 bulan yang diberikan owner/kampus: Bulan 1 Onboarding & Landing Page → Bulan 6 Finalisasi, QA & Handover). Setiap task punya **file yang disentuh**, **langkah**, dan **acceptance criteria** (= "selesai bila…"). Tugas dianggap selesai hanya jika **semua** acceptance criteria terpenuhi **dan** `templates/PR_CHECKLIST.md` dicentang.

## Cara membaca

- **Level:** ⭐ pemula · ⭐⭐ menengah · ⭐⭐⭐ sulit / sensitif (wajib pair dengan mentor).
- **Estimasi:** jam kerja kalender bersama AI (vibe coding), termasuk uji manual. Anggap sebagai patokan ±50%.
- **Review:** 🔒 = menyentuh keamanan/uang/schema → mentor wajib review sebelum merge.
- **Butuh:** task yang harus selesai lebih dulu.

## Status pengerjaan (diperbarui 24 Okt 2026)

Dicek lewat pembacaan kode dan uji manual/curl; **belum ada test otomatis**. ✅ selesai · 🟡 sebagian · ⬜ belum.

| Status | Task | Catatan |
|---|---|---|
| ✅ | P0-1 IDOR | Kepemilikan dicek di accounts, categories, debts. Belum ada skrip uji dua akun. |
| ✅ | P0-2 Plan di server | `requirePro` di 7 endpoint, batas 1 rekening FREE. Belum ada test matriks. |
| ✅ | P0-3 Secret | `lib/env.ts`, seed dari env, `/api/auth/seed` dihapus. Riwayat git lama tetap memuat secret lama (rotasi tugas owner). |
| ✅ | P0-4 Plan efektif dari DB | `lib/plan.ts`, `getCurrentUser`. Belum ada unit test tabel. |
| ✅ | P0-5 Rate limit | Upstash + cadangan in-memory (tidak efektif di serverless). |
| ✅ | T-1.1 Setup lokal | App jalan di localhost, DB di Supabase pribadi. |
| 🟡 | T-1.2 / T-1.3 Landing page | Terimplementasi (harga, FAQ, SEO, `lib/plans.ts`, tanpa redirect). Belum: persetujuan wireframe, ukur Lighthouse. |
| ✅ | T-2.1 Terms & Privacy | `/terms`, `/privacy`, checkbox wajib (client+server), `User.termsAcceptedAt`. **Teks masih draf, perlu tinjauan owner/hukum.** |
| ✅ | T-2.2 Onboarding | `seedDefaultCategories` saat register, `OnboardingChecklist` di dashboard (status dihitung dari data, bisa ditutup, tersimpan di `UserProfile.onboardingDismissedAt`). Hanya tampil untuk akun < 30 hari. |
| 🟡 | T-2.3 Email welcome | Kode selesai: `lib/email.ts` (Resend via REST), template ID/EN, dikirim dari register tanpa memblokir. Teruji dengan mock. **Belum teruji kirim sungguhan**: butuh akun Resend, `RESEND_API_KEY`, dan SPF/DKIM `grexion.ai`. **Keputusan owner: email wajib saat daftar** (client + server, format divalidasi, disimpan huruf kecil, unik); user lama tanpa email tidak terpengaruh. |
| 🟡 | T-2.4 Reset password | Selesai & teruji: `/forgot-password`, `/reset-password`, `PasswordResetToken` (hash SHA-256, 1 jam, sekali pakai, aman terhadap permintaan serentak), rate limit, respons generik. Email reset baru terkirim sungguhan setelah Resend aktif (di dev tautan dicetak di terminal). **Belum**: sesi/JWT lama tetap valid setelah reset (opsional di handover: `passwordChangedAt`). |
| ✅ | T-3.1 Free trial 14 hari | Register: `plan PRO` + `planExpiresAt = trialEndsAt = +14 hari` (`TRIAL_DAYS` di `lib/plans.ts`). Banner sisa hari + badge TRIAL di sidebar, label TRIAL di panel admin (trial = `planExpiresAt` masih sama dengan `trialEndsAt`; diubah admin/pembayaran → dianggap berbayar). Hari ke-15 otomatis FREE tanpa login ulang. Hanya akun baru; tidak ada backfill. |
| ✅ | T-3.2 Permintaan pembayaran (user) | **Teruji ke Supabase Storage sungguhan** (bucket privat `payment-proofs` dibuat via `npm run storage:setup`; Supabase sendiri menolak tipe/ukuran di luar aturan; URL publik tidak bisa mengakses bukti). Rincian: `PaymentRequest`, `POST /api/payments/upload-url`, `POST/GET /api/payments`, form + riwayat di `/dashboard/upgrade`, `lib/storage.ts`, `npm run storage:setup`. Nominal dari server, 1 PENDING/user (Serializable), bukti privat. Dependency baru: `@supabase/storage-js`. |
| ✅ | T-3.3 Panel admin approve/reject | `/dashboard/admin/payments` (+ menu "Pembayaran"), `GET/PATCH /api/admin/payments`, `GET /api/admin/payments/[id]/proof` (signed URL 60 dtk), `lib/payments.ts`. Approve atomik & idempoten (klaim `updateMany` bersyarat, teruji 6 permintaan serentak → 1 berhasil), masa aktif = max(sekarang, lama) + 1 bulan/1 tahun (kalender, 31 Jan → 28 Feb), reject wajib alasan, hanya ADMIN. PRO tanpa batas (manual) tidak dipendekkan. Teruji ke Supabase sungguhan. |
| ⬜ | T-3.4 Notifikasi pembayaran & uji alur | Email disetujui/ditolak belum ada; WA/rekening masih placeholder di halaman upgrade. |
| ⬜ | T-4.1 – T-4.4 Cron, reminder, analytics, digest | `vercel.json` belum ada. |
| ⬜ | T-5.1 – T-5.4 Produktivitas | |
| ⬜ | T-6.1 – T-6.6 Finalisasi | |
| ⬜ | T-DEBT-1 … 11 | Belum ada ESLint, Zod, Vitest, `$transaction`; CORS `*` dan `googleSheets.ts` masih ada. |
| ✅ | T-OWN-1 Ganti bahasa | ID/EN, tersimpan di cookie (belum di `UserProfile`). |
| 🟡 | T-OWN-2 Mata uang | Kurs live gratis + 27 mata uang tampilan. Belum: simpan kurs di DB cloud, cron. |
| ✅ | T-OWN-3 Landing page | Mengikuti T-1.3. |
| ⬜ | T-OWN-4 Perbarui `.md` | `README.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md` di root masih usang. |
| ✅ | T-OWN-5 Supabase pribadi | Terhubung dan tabel sudah dibuat. Data lama tidak ikut pindah. |
| ⬜ | T-OWN-6, 7, 8, 9 / T-BOT-1 | Chatbot, notifikasi admin, nota Gemini, bot Telegram aman. |

**Pekerjaan di luar backlog yang sudah masuk:** perbaikan logout yang dulu menghapus data semua user, hardening fetch client dan pool DB, seed akun demo.

## Ringkasan & peta ke timeline

| Bulan | Fokus timeline | Task |
|---|---|---|
| **Minggu 1–2 (awal Bulan 1)** | Onboarding + **penutupan celah kritis** | Setup lokal, **P0-1 … P0-5** |
| **Bulan 1** | Onboarding & Landing Page | T-1.1 … T-1.3 |
| **Bulan 2** | Legal, Onboarding Flow & Email | T-2.1 … T-2.4 |
| **Bulan 3** | Free Trial & Payment Request | T-3.1 … T-3.4 |
| **Bulan 4** | Subscription Lifecycle & Analytics | T-4.1 … T-4.4 |
| **Bulan 5** | Fitur Produktivitas | T-5.1 … T-5.4 |
| **Bulan 6** | Finalisasi, QA & Handover | T-6.1 … T-6.6 |
| Paralel / stretch | Utang teknis & bot | T-DEBT-1 … 11, T-BOT-1 |
| **Tambahan owner** | Bahasa, kurs, Supabase pribadi, notifikasi admin, nota Gemini, bot | T-OWN-1 … T-OWN-9 (lihat bagian "BAGIAN OWNER") |

> **Penyesuaian terhadap timeline awal:** (1) tugas P0 (keamanan) belum tertulis di timeline dan harus dikerjakan di 2 minggu pertama — slot Bulan 1 cukup longgar; (2) item "Search & pagination" di Bulan 5 **sudah ada** di kode, jadi diganti dengan preset rentang tanggal + pembatasan server untuk FREE (T-5.3); (3) rate limiting (timeline Bulan 1, minggu 4) = **P0-5**.

**Urutan ketergantungan penting**

```
P0-3 → semua orang (secret & env bersih)
P0-4 (plan efektif dari DB) → T-3.1 (trial), T-4.1 (cron), T-3.3 (approve)
P0-5 (rate limit) → T-2.4 (reset password)
T-2.3 (email) → T-2.4, T-3.4, T-4.2, T-4.4
T-3.2 (PaymentRequest) → T-3.3 → T-4.3 (analytics)
T-4.1 (cron infra) → T-4.2, T-4.4, T-5.1
```

---

# BAGIAN P0 — Wajib sebelum rilis publik (Minggu 1–2, bersama mentor)

### P0-1 · Tutup celah IDOR di 5 handler 🔒
- **Level/estimasi:** ⭐⭐ · 4–6 jam · **Butuh:** setup lokal
- **Masalah:** `accounts` PATCH+DELETE, `categories` PATCH+DELETE, `debts` PATCH memanggil `update/delete({ where: { id } })` tanpa memastikan `id` milik user login.
- **File:** `app/api/accounts/route.ts` (baris 74, 96), `app/api/categories/route.ts` (47, 69), `app/api/debts/route.ts` (58)
- **Langkah:**
  1. Untuk tiap handler, cek kepemilikan dulu: `const existing = await prisma.X.findFirst({ where: { id, userId: user.userId } }); if (!existing) return 404;` (pola yang sudah benar ada di `goals/route.ts:41`).
  2. Alternatif ringkas: `updateMany`/`deleteMany({ where: { id, userId } })` lalu cek `count === 0` → 404.
  3. Pastikan pesan error konsisten (`Not found`).
- **Selesai bila:**
  - [ ] Dengan 2 akun (A, B): B memanggil PATCH/DELETE memakai ID milik A → **404** dan data A tidak berubah (uji untuk kelima handler).
  - [ ] Alur normal (edit/hapus milik sendiri) tetap jalan di UI Settings & Rekening.
  - [ ] Ada skrip uji (curl atau test Vitest/Playwright) yang dilampirkan di PR.
- **Prompt starter:** lihat `08_VIBE_CODING_GUIDE.md` § Template "Perbaikan bug keamanan".

### P0-2 · Tegakkan plan FREE/PRO di server 🔒
- **Level/estimasi:** ⭐⭐ · 6–8 jam · **Butuh:** P0-1 selesai (agar pola cek konsisten)
- **File:** `lib/auth.ts` (tambah helper), route: `savings`, `debts`, `debt-payments`, `assets`, `budget`, `goals`, `reports`; `accounts` (batas kuantitas); `lib/services.ts` (pembuatan rekening otomatis)
- **Langkah:**
  1. Tambah di `lib/auth.ts`: `requirePro(user): NextResponse | null` (403 `{ error: 'Fitur PRO' }`). Gunakan `isPro(user)` yang sudah ada.
  2. Panggil di **semua method** (GET/POST/PATCH/DELETE) route PRO, tepat setelah cek login.
  3. **Batas 1 rekening untuk FREE:** di `POST /api/accounts` hitung `prisma.account.count({ where: { userId } })`; bila ≥ 1 dan bukan PRO → 403 dengan pesan ramah. ⚠ `createTransaction` & `createSavingsInvestment` di `services.ts` juga **membuat rekening otomatis** jika namanya belum ada — buat satu fungsi `getOrCreateAccount(user, name)` yang menegakkan batas yang sama.
  4. Pesan 403 di client harus memunculkan ajakan upgrade (bukan error mentah).
- **Selesai bila:**
  - [ ] Akun FREE: `curl` ke 7 endpoint PRO → 403 (semua method). Akun PRO & ADMIN → normal.
  - [ ] Akun FREE tidak dapat memiliki >1 rekening lewat UI, API, maupun transaksi dengan nama rekening baru.
  - [ ] Halaman PRO tetap menampilkan `ProGate` untuk FREE (tidak ada layar error).
  - [ ] Test otomatis untuk matriks (FREE/PRO/ADMIN × endpoint) ada dan lulus.
- **Catatan:** dashboard "bulan berjalan" untuk FREE dikerjakan di T-5.3.

### P0-3 · Bersihkan secret, kunci seed, wajibkan JWT_SECRET 🔒
- **Level/estimasi:** ⭐⭐ · 4–6 jam · **Butuh:** — (owner harus rotate password/secret produksi lebih dulu; lihat README § 0)
- **File:** `prisma/seed.ts`, `app/api/auth/seed/route.ts`, `app/api/auth/login/route.ts`, `app/api/auth/verify/route.ts`, `lib/auth.ts`, `middleware.ts`, `templates/.env.example`, `CLAUDE.md`/`AGENTS.md`
- **Langkah:**
  1. Buat `lib/env.ts` (**Edge-safe**: hanya `process.env`, tanpa API Node) yang mengekspor `JWT_SECRET` dan **melempar error** bila kosong atau < 32 karakter. Ganti 4 deklarasi `process.env.JWT_SECRET || '...'` dengan impor ini.
  2. `prisma/seed.ts`: baca `SEED_ADMIN_USERNAME` & `SEED_ADMIN_PASSWORD` dari env; berhenti dengan pesan jelas bila kosong. Hapus password tertanam.
  3. `app/api/auth/seed/route.ts`: **hapus file** (rekomendasi). Bila tetap ingin ada: hanya jalan bila belum ada ADMIN + wajib header `x-setup-token` = env `SETUP_TOKEN`, dan set `role: 'ADMIN'`.
  4. Hapus `/api/auth/seed` dari `PUBLIC_ROUTES` di `middleware.ts`.
  5. Perbarui `.env.example` (`JWT_SECRET`, `SEED_ADMIN_*`, hapus `API_SECRET` yang tidak dipakai) dan `CLAUDE.md`/`AGENTS.md` (tanpa kredensial).
  6. Pindai repo: `git grep -n "your-secret-key"` harus kosong, dan minta mentor menjalankan `git grep` untuk password admin lama (mentor yang tahu nilainya) — hasilnya harus kosong di working tree.
- **Selesai bila:**
  - [ ] Menjalankan app tanpa `JWT_SECRET` → gagal cepat dengan pesan jelas (bukan jalan dengan secret default).
  - [ ] `git grep` untuk `your-secret-key` dan password admin lama → **0 hasil** di working tree.
  - [ ] `POST /api/auth/seed` → 404 (atau 401/403 tanpa token).
  - [ ] Login admin lokal tetap berfungsi setelah `npm run db:seed` dengan env baru.
- **Catatan untuk owner:** riwayat git tetap memuat secret lama → rotate di produksi; bila repo sudah pernah dibagikan, pertimbangkan `git filter-repo`.

### P0-4 · Plan efektif dari database + kedaluwarsa nyata 🔒
- **Level/estimasi:** ⭐⭐⭐ · 8–12 jam · **Butuh:** P0-2
- **File:** `lib/auth.ts`, `lib/plan.ts` (baru), `app/api/auth/verify/route.ts`, `app/api/auth/login/route.ts`, `app/auth-context.tsx`, semua pemakai `isPro`
- **Ide:** jangan percaya `plan` di JWT. Tentukan plan dari DB setiap kali dibutuhkan.
- **Langkah:**
  1. `lib/plan.ts`: `getEffectivePlan({ role, plan, planExpiresAt }, now = new Date()): 'FREE' | 'PRO'` (fungsi murni; mudah diuji).
  2. `getCurrentUser(req)` (async): verifikasi JWT → `prisma.user.findUnique` (select `role, plan, planExpiresAt`) → kembalikan user dengan `effectivePlan`. Dipakai `requirePro` dan `/api/auth/verify`.
  3. `GET /api/auth/verify` mengembalikan `plan` efektif dari DB (client otomatis benar setelah reload).
  4. Biarkan JWT membawa `userId` & `role`; `plan` di token boleh dihapus.
- **Tabel uji wajib (unit test `getEffectivePlan`):**

  | role | plan | planExpiresAt | hasil |
  |---|---|---|---|
  | ADMIN | (apa pun) | (apa pun) | PRO |
  | USER | FREE | null | FREE |
  | USER | PRO | null | PRO (tanpa batas, diatur manual admin) |
  | USER | PRO | besok | PRO |
  | USER | PRO | kemarin | **FREE** |
- **Selesai bila:**
  - [ ] Admin menurunkan user ke FREE → request API berikutnya dari user itu langsung 403 di fitur PRO **tanpa login ulang**.
  - [ ] User dengan `planExpiresAt` lampau diperlakukan FREE di API **dan** UI, walau kolom `plan` masih `PRO`.
  - [ ] Unit test tabel di atas lulus.
  - [ ] Latensi tambahan satu query per request PRO dapat diterima (catat di PR).

### P0-5 · Rate limiting login & register 🔒
- **Level/estimasi:** ⭐⭐ · 4–6 jam · **Butuh:** P0-3
- **File:** `lib/rateLimit.ts` (baru), `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `templates/.env.example`
- **Catatan desain:** memori proses tidak efektif di serverless (Vercel). Pakai **Upstash Redis** (`@upstash/ratelimit`, free tier). Tanpa env → no-op di dev (log peringatan sekali).
- **Aturan awal:** login 5 percobaan / 15 menit per kombinasi IP+username; register 5 / jam per IP. Lewat batas → `429` + header `Retry-After`. Pesan generik (jangan bocorkan apakah username ada).
- **Selesai bila:**
  - [ ] Percobaan ke-6 login salah dalam 15 menit → 429; setelah jendela lewat → boleh lagi.
  - [ ] Login sukses tidak terhalang oleh batas percobaan gagal orang lain.
  - [ ] UI menampilkan pesan "Terlalu banyak percobaan, coba lagi nanti".
  - [ ] Env baru terdokumentasi.

---

# BULAN 1 — Onboarding & Landing Page

### T-1.1 · Setup lokal & tur kode
- ⭐ · 1–2 hari · **Butuh:** —
- Ikuti `09_LOCAL_SETUP.md`. Buat 2 akun (satu USER FREE lewat `/register`, satu ADMIN via seed), ubah USER jadi PRO dari Admin Panel, telusuri setiap halaman.
- **Selesai bila:** [ ] app jalan di laptop; [ ] kamu bisa menjelaskan alur login → JWT → middleware → API tanpa melihat catatan; [ ] mengisi `DAILY_LOG.md` hari pertama; [ ] menuliskan 5 pertanyaan/kebingungan untuk mentor.

### T-1.2 · Wireframe & konten landing page
- ⭐ · 1–2 hari · **Butuh:** —
- Susun bagian: Navbar (Masuk / Daftar) · Hero (janji + CTA "Daftar Gratis") · Fitur (8 kartu) · Cara kerja (3 langkah) · **Harga FREE vs PRO** · FAQ · Footer (link ToS/Privasi, kontak). Salin copy dari `docs/01_PROJECT_OVERVIEW.md` & `dashboard/upgrade/page.tsx`. Tulis wireframe (Figma/kertas) + teks Bahasa Indonesia; persetujuan owner sebelum kode.
- **Selesai bila:** [ ] wireframe mobile + desktop disetujui owner; [ ] daftar teks final tersedia.

### T-1.3 · Implementasi landing page publik 
- ⭐⭐ · 3–4 hari · **Butuh:** T-1.2
- **File:** `app/page.tsx` (tulis ulang), `lib/plans.ts` (baru — sumber tunggal harga/fitur), `app/dashboard/upgrade/page.tsx` (pakai `plans.ts`), `app/layout.tsx` (metadata SEO)
- **Langkah:** (1) hapus `useEffect` yang me-redirect; jika sudah login tampilkan tombol "Buka Dashboard" (bukan redirect paksa). (2) Pisahkan konten statis (server component) dari `AuthCta` kecil (client). (3) **Perbaiki kelas Tailwind dinamis** (`bg-${color}-500/20`) dengan peta statis `{ blue: 'bg-blue-500/20 text-blue-400', … }`. (4) Ekstrak harga & daftar fitur ke `lib/plans.ts` agar landing & halaman upgrade tidak menyimpang. (5) Metadata: `title`, `description`, Open Graph.
- **Selesai bila:**
  - [ ] Membuka `/` saat logout **dan** login menampilkan landing (tidak ada redirect).
  - [ ] Responsif 360px–1440px; tanpa scroll horizontal.
  - [ ] Semua CTA bekerja (`/register`, `/login`); bagian harga cocok dengan `/dashboard/upgrade`.
  - [ ] `npm run build` lalu jalankan `npm start`: warna ikon fitur tampil di **production build**.
  - [ ] Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 90.

---

# BULAN 2 — Legal, Onboarding Flow & Email

### T-2.1 · Halaman ToS & Privacy Policy
- ⭐ · 2–3 hari · **Butuh:** T-1.3 (footer)
- **File:** `app/terms/page.tsx`, `app/privacy/page.tsx` (server component, publik), `app/register/page.tsx` (checkbox wajib "Saya setuju…"), opsional `User.termsAcceptedAt`
- Draf dari owner/konsultan hukum; intern hanya menyusun tata letak & alur. Rujukan topik: data apa yang dikumpulkan, tujuan, penyimpanan, hak pengguna, kontak — mengacu UU Pelindungan Data Pribadi (UU 27/2022). **Bukan nasihat hukum; wajib ditinjau owner.**
- **Selesai bila:** [ ] `/terms` & `/privacy` dapat dibuka tanpa login; [ ] register menolak jika checkbox tidak dicentang (client **dan** server); [ ] footer landing menautkan keduanya.

### T-2.2 · Onboarding user baru
- ⭐⭐ · 3–4 hari · **Butuh:** T-1.3
- **Fakta kode:** user baru dari `/register` **tidak punya kategori/rekening** (seed hanya untuk admin). Kategori dibuat otomatis saat pertama dipakai.
- **Langkah:** (1) fungsi `seedDefaultCategories(userId)` (kategori umum dari `prisma/seed.ts`) dipanggil saat register. (2) Komponen `OnboardingChecklist` di dashboard: "Buat rekening pertama", "Catat transaksi pertama", "Atur target di Pengaturan" — status **dihitung dari data** (count rekening/transaksi), bukan flag manual. (3) Bisa disembunyikan; ingat pilihan (kolom `UserProfile.onboardingDismissedAt` atau localStorage).
- **Selesai bila:** [ ] akun baru langsung punya kategori default; [ ] checklist tercentang otomatis saat langkah dilakukan; [ ] hilang setelah semua selesai/ditutup; [ ] user lama tidak terpengaruh.

### T-2.3 · Email transaksional (welcome)
- ⭐⭐ · 3–4 hari · **Butuh:** —
- **Rekomendasi:** Resend (free tier) + verifikasi domain `grexion.ai` (record SPF & DKIM di cPanel DNS — koordinasi dengan owner).
- **File:** `lib/email.ts` (`sendEmail`), `lib/email/templates/*.ts` (HTML string biasa), `app/api/auth/register/route.ts`, `.env.example` (`RESEND_API_KEY`, `EMAIL_FROM`)
- **Aturan:** kirim **tanpa memblokir** pendaftaran (try/catch, catat error); jangan pernah menaruh password di email. `email` saat ini opsional di form daftar → **putuskan bersama owner** apakah diwajibkan (diperlukan untuk reset password).
- **Selesai bila:** [ ] email welcome masuk ke inbox Gmail (bukan spam) dengan SPF/DKIM = pass; [ ] gagal kirim tidak menggagalkan register; [ ] template terbaca baik di mobile.

### T-2.4 · Lupa & reset password 🔒
- ⭐⭐⭐ · 4–5 hari · **Butuh:** T-2.3, P0-5
- **Schema:** `model PasswordResetToken { id, userId, tokenHash String @unique, expiresAt, usedAt?, createdAt }` (simpan **hash SHA-256**, bukan token asli).
- **Endpoint:** `POST /api/auth/forgot-password {email}` → **selalu 200** dengan pesan generik (jangan bocorkan email terdaftar); `POST /api/auth/reset-password {token, password, confirmPassword}`. **Halaman:** `/forgot-password`, `/reset-password?token=`.
- **Aturan:** token acak 32 byte (`crypto.randomBytes`), kedaluwarsa 1 jam, sekali pakai, minimal password 8 (samakan dengan register), rate limit di kedua endpoint.
- **Selesai bila:** [ ] alur penuh berjalan; [ ] token kedaluwarsa/terpakai ditolak; [ ] respons forgot-password identik untuk email terdaftar & tidak; [ ] di DB tidak ada token mentah; [ ] mentor lulus review.
- **Catatan lanjut:** JWT stateless → sesi lama tetap valid setelah reset. Solusi (opsional): kolom `passwordChangedAt` dan tolak token yang `iat`-nya lebih tua.

---

# BULAN 3 — Free Trial & Payment Request

### T-3.1 · Free trial PRO 14 hari otomatis 🔒
- ⭐⭐ · 2–3 hari · **Butuh:** **P0-4** (jika tidak, trial tidak pernah berakhir)
- **File:** `app/api/auth/register/route.ts` (set `plan: 'PRO'`, `planExpiresAt: now + 14 hari`), `app/dashboard/layout.tsx` (banner sisa hari), `lib/plans.ts`
- **Selesai bila:** [ ] user baru = PRO efektif 14 hari; [ ] banner "Trial berakhir dalam N hari" + tombol upgrade; [ ] pada hari ke-15 otomatis FREE (uji dengan mengubah `planExpiresAt` ke masa lalu); [ ] admin bisa membedakan user trial vs berbayar (tambahkan label di panel admin, mis. berdasarkan ada/tidaknya PaymentRequest disetujui); [ ] tidak ada trial ganda untuk akun yang sama.
- **Catatan produk:** daftar-ulang dengan email lain bisa menyalahgunakan trial; verifikasi email (opsional) mengurangi ini.

### T-3.2 · Permintaan pembayaran (sisi user) 🔒
- ⭐⭐⭐ · 5–6 hari · **Butuh:** —
- **Schema:**
  ```prisma
  enum PaymentPlan   { PRO_MONTHLY PRO_YEARLY }
  enum PaymentStatus { PENDING APPROVED REJECTED }
  model PaymentRequest {
    id String @id @default(cuid())
    userId String
    user User @relation(fields: [userId], references: [id], onDelete: Cascade)
    plan PaymentPlan
    amount Int                       // rupiah, dari lib/plans.ts — jangan percaya body request
    proofPath String                 // path di storage privat
    status PaymentStatus @default(PENDING)
    userNote String?
    adminNote String?
    createdAt DateTime @default(now())
    reviewedAt DateTime?
    reviewedById String?
    @@index([userId]) @@index([status])
  }
  ```
- **Storage:** Supabase Storage bucket **privat** `payment-proofs`. Server membuat *signed upload URL*; browser mengunggah langsung. Validasi tipe (jpg/png/webp/pdf) & ukuran ≤ 2 MB. `SUPABASE_SERVICE_ROLE_KEY` **hanya di server, jangan berawalan `NEXT_PUBLIC_`**.
- **Endpoint:** `POST /api/payments` (buat; harga dari server), `GET /api/payments` (milik sendiri). **Halaman:** form di `/dashboard/upgrade` (ganti tombol WhatsApp) + riwayat status.
- **Selesai bila:** [ ] user mengunggah bukti & melihat status PENDING; [ ] file tidak dapat diakses publik (URL langsung tanpa signature → ditolak); [ ] nominal tidak bisa dimanipulasi dari client; [ ] maksimal 1 permintaan PENDING per user; [ ] file >2 MB / tipe salah ditolak.

### T-3.3 · Panel admin approve/reject 🔒
- ⭐⭐ · 3–4 hari · **Butuh:** T-3.2, P0-4
- **File:** `app/api/admin/payments/route.ts` (GET daftar, PATCH `{id, action, adminNote}`), halaman `/dashboard/admin/payments` (atau tab di admin), `lib/plan.ts`
- **Aturan approve:** dalam **satu `prisma.$transaction`**: tandai APPROVED + set `user.plan='PRO'` + `planExpiresAt = max(sekarang, planExpiresAt lama) + 1 bulan/1 tahun`. **Idempoten** (approve dua kali tidak menambah masa aktif). Bukti dilihat lewat signed URL berumur pendek (≤ 60 dtk).
- **Selesai bila:** [ ] approve → user langsung PRO efektif tanpa login ulang (P0-4); [ ] masa aktif menumpuk benar bila perpanjang sebelum habis; [ ] reject wajib alasan; [ ] hanya ADMIN (403 untuk lainnya); [ ] test approve ganda.

### T-3.4 · Notifikasi pembayaran & uji alur
- ⭐⭐ · 2–3 hari · **Butuh:** T-3.3, T-2.3
- Email "Pembayaran diterima/ditolak"; konfigurasi nomor WA & rekening dari env/`lib/plans.ts` (hapus placeholder `628xxxxxxxxxx`/`1234567890`); uji end-to-end signup → trial → bayar → approve.
- **Selesai bila:** [ ] kedua email terkirim; [ ] tidak ada placeholder tersisa di UI; [ ] skenario e2e tercatat (Playwright bila sudah ada, jika belum checklist manual di PR).

---

# BULAN 4 — Subscription Lifecycle & Analytics

### T-4.1 · Cron: auto-downgrade plan kedaluwarsa 🔒
- ⭐⭐ · 2–3 hari · **Butuh:** P0-4
- **File:** `app/api/cron/expire-plans/route.ts`, `vercel.json` (`crons`), `.env.example` (`CRON_SECRET`)
- **Aturan:** verifikasi header `Authorization: Bearer ${CRON_SECRET}` (Vercel mengirimnya otomatis jika env diset) → selain itu 401. `updateMany({ where: { role: 'USER', plan: 'PRO', planExpiresAt: { lt: now } }, data: { plan: 'FREE' } })`. Idempoten; kembalikan `{ downgraded: n }`. Jadwal Vercel = **UTC**; paket Hobby hanya sekali/hari.
- **Selesai bila:** [ ] user kedaluwarsa kemarin → `FREE` setelah cron dipanggil; [ ] tanpa/salah secret → 401; [ ] user tanpa `planExpiresAt` (PRO manual) tidak tersentuh; [ ] admin tidak tersentuh.

### T-4.2 · Email pengingat perpanjangan
- ⭐⭐ · 2–3 hari · **Butuh:** T-4.1, T-2.3
- Cron harian: user PRO dengan `planExpiresAt` 3 hari lagi dan belum diingatkan → kirim email + tandai (kolom baru `renewalReminderSentFor DateTime?` berisi tanggal expiry yang sudah diingatkan agar tidak ganda).
- **Selesai bila:** [ ] satu email per periode; [ ] tidak terkirim ke user tanpa email; [ ] menjalankan cron dua kali sehari tidak menggandakan email.

### T-4.3 · Admin analytics
- ⭐⭐ · 3–4 hari · **Butuh:** T-3.2 (data pembayaran) — sebelum itu boleh pakai estimasi
- **File:** `app/api/admin/analytics/route.ts`, `app/dashboard/admin/analytics/page.tsx`
- **Metrik:** total user; user baru 7/30 hari; aktif (`lastLogin` ≤ 30 hari); FREE vs PRO vs trial aktif; **konversi** = user dengan ≥1 pembayaran APPROVED ÷ total user; **MRR** = Σ (bulanan: Rp29.000; tahunan: Rp249.000 ÷ 12) untuk PRO berbayar yang masih aktif; grafik pertumbuhan user per minggu (`recharts`).
- **Selesai bila:** [ ] angka cocok dengan hitungan manual dari `prisma studio` pada data uji; [ ] hanya ADMIN; [ ] definisi tiap metrik tertulis di halaman (tooltip) agar tidak ambigu.

### T-4.4 · Email digest mingguan
- ⭐⭐⭐ · 4–5 hari · **Butuh:** T-4.1 (infra cron), T-2.3
- Cron Senin pagi (UTC 01:00 = 08:00 WIB): ringkasan minggu lalu vs sebelumnya (pakai `getWeeklyReport`), kategori teratas, peringatan budget. **Opt-out wajib:** `UserProfile.emailDigest Boolean @default(true)` + saklar di Pengaturan + tautan berhenti berlangganan (token bertanda tangan). Kirim per batch dengan jeda (patuhi batas laju provider).
- **Selesai bila:** [ ] hanya user ber-email & opt-in; [ ] tautan berhenti langsung bekerja tanpa login; [ ] tidak ada email untuk user tanpa transaksi minggu itu (atau versi "belum ada aktivitas" yang disetujui owner); [ ] 100 user uji selesai tanpa timeout.

---

# BULAN 5 — Fitur Produktivitas

### T-5.1 · Transaksi berulang
- ⭐⭐⭐ · 6–7 hari · **Butuh:** T-4.1 (infra cron), P0-4 🔒 (schema)
- **Schema:** `RecurringTransaction { id, userId, categoryId, accountId, type, amount, description, note?, frequency (DAILY|WEEKLY|MONTHLY|YEARLY), startDate, endDate?, nextRunAt, lastRunAt?, active }`.
- **Aturan:** cron harian membuat transaksi jatuh tempo **lewat `createTransaction`** (agar saldo ikut benar), lalu memajukan `nextRunAt` dalam `prisma.$transaction`. Kejar jadwal yang terlewat (loop, batas 31). Tanggal 29/30/31 pada bulan pendek → pakai hari terakhir bulan itu. **Zona waktu:** server UTC vs pengguna WIB (lihat `10_CONVENTIONS.md` § Zona waktu).
- **UI:** daftar, buat, jeda, hapus. Putuskan bersama owner: fitur PRO atau semua.
- **Selesai bila:** [ ] transaksi terbuat tepat sekali per jadwal walau cron jalan dua kali; [ ] saldo rekening benar; [ ] jadwal terlewat 3 bulan terkejar; [ ] 31 Jan → 28/29 Feb benar; [ ] uji dengan `nextRunAt` masa lalu.

### T-5.2 · Net Worth di dashboard
- ⭐⭐ · 3–4 hari · **Butuh:** —
- **Definisi (hindari hitung ganda):** `netWorth = Σ saldo rekening (isDebt=false) + Σ nilai aset saat ini + Σ piutang belum tertagih − Σ hutang belum lunas` (dari `getDebtSummaries`). **Jangan** menjumlahkan rekening `isDebt` (sudah tercermin di hutang).
- **File:** `lib/services.ts` (`getNetWorth(userId)`), `getDashboardData`, `app/dashboard/page.tsx` (kartu KPI + rincian), `types/index.ts`
- **Selesai bila:** [ ] unit test dengan fixture (rekening 10jt, aset 5jt, hutang 3jt, piutang 1jt → 13jt); [ ] rincian komponen terlihat; [ ] kartu terkunci untuk FREE (memakai data PRO); [ ] tidak ada hitung ganda kartu kredit.
- **Stretch:** tabel `NetWorthSnapshot` bulanan untuk grafik tren.

### T-5.3 · Preset rentang tanggal + batas FREE di server
- ⭐ · 2 hari · **Butuh:** P0-4
- **File:** komponen `app/components/DateRangePresets.tsx` (baru), `app/dashboard/page.tsx`, `app/transactions/page.tsx`, `app/api/dashboard-data/route.ts`
- Tombol: Bulan ini · Bulan lalu · 7 hari · 30 hari · 3 bulan · Tahun ini · Semua. **Server:** untuk plan efektif FREE, paksa `startDate`/`endDate` ke bulan berjalan (abaikan parameter client) dan kirim penanda agar UI menampilkan ajakan upgrade.
- **Selesai bila:** [ ] preset mengisi kedua input tanggal & memuat data; [ ] FREE memanggil API dengan rentang tahun lalu → tetap bulan berjalan; [ ] PRO tidak dibatasi; [ ] batas bulan benar di tanggal 1 pukul 00:30 WIB (uji zona waktu).

### T-5.4 · Import CSV/Excel 🔒
- ⭐⭐⭐ · 6–7 hari · **Butuh:** P0-2
- **Alur:** unggah → parsing di client → **pemetaan kolom** → **pratinjau + validasi per baris** → konfirmasi → kirim per batch → laporan hasil (berhasil/dilewati/gagal + alasan). Sediakan template CSV. Batas 1.000 baris per impor & ukuran file 2 MB. Deteksi duplikat sederhana (tanggal+nominal+deskripsi).
- **Perhatian:** `parseCurrency` di `lib/utils.ts` **membuang titik dan koma** → `"1.000,50"` menjadi `100050`. Aman untuk Rupiah bulat tetapi salah untuk desimal; putuskan aturan (Rupiah tanpa desimal) dan validasi. Pakai library parser tepercaya (`papaparse` untuk CSV; `exceljs` untuk XLSX) — periksa `npm audit` sebelum menambah dependency; tanya mentor.
- **Selesai bila:** [ ] file 500 baris valid terimpor & saldo rekening benar; [ ] baris salah tidak menggagalkan yang benar dan dilaporkan; [ ] impor ulang file yang sama tidak menggandakan (atau memperingatkan); [ ] file >2 MB / >1.000 baris ditolak dengan pesan jelas.

---

# BULAN 6 — Finalisasi, QA & Handover

### T-6.1 · Export laporan PDF/Excel
- ⭐⭐ · 4–5 hari · **Butuh:** —
- Export transaksi (sesuai filter aktif) dan laporan bulanan ke **CSV/XLSX** (`exceljs`) dan **PDF** (`@react-pdf/renderer` atau `pdf-lib`). Route server yang mengalirkan file; hormati `userId` & plan.
- **Selesai bila:** [ ] file terbuka normal di Excel & PDF viewer; [ ] hanya data milik user; [ ] format Rupiah/tanggal Indonesia benar; [ ] 5.000 baris selesai < 10 detik.

### T-6.2 · Error tracking (Sentry)
- ⭐ · 1–2 hari · **Butuh:** T-DEBT-3
- `@sentry/nextjs` (wizard), `SENTRY_DSN`; **jangan kirim PII** (password, body request, email) — atur `beforeSend`. Sertakan `userId` ter-hash saja.
- **Selesai bila:** [ ] error uji dari API & dari client muncul di Sentry dengan stack trace terbaca; [ ] tidak ada password/token pada event; [ ] source map di-upload.

### T-6.3 · QA end-to-end (Playwright) & regresi
- ⭐⭐ · 5–6 hari · **Butuh:** fitur Bulan 1–5
- Suite e2e: register → login → tambah transaksi → dashboard; FREE ditolak di fitur PRO (UI & API); admin jadikan PRO → akses terbuka; trial berakhir; payment request → approve; **uji IDOR** (dua user); reset password. Jalankan di GitHub Actions dengan DB uji terpisah. Catat bug di file baru `docs/BUG_LOG.md` (buat sendiri).
- **Selesai bila:** [ ] ≥ 10 skenario hijau di CI; [ ] semua bug kritikal/tinggi tertutup; [ ] laporan QA (ringkasan hasil) dilampirkan.

### T-6.4 · Kesiapan produksi
- ⭐⭐ · 3 hari · **Butuh:** T-6.3
- Checklist: semua env produksi terisi (lihat `.env.example`); `npm run build` bersih; tidak ada `console.log` sisa; header keamanan dasar; hapus CORS `*` (T-DEBT-8); cek `npm audit`; backup DB Supabase aktif; ganti semua placeholder; uji di perangkat mobile.
- **Selesai bila:** checklist tertandatangani mentor.

### T-6.5 · Deploy Vercel + Supabase + domain 🔒
- ⭐⭐ · 2–3 hari · **Butuh:** T-6.4 — **dikerjakan bersama owner** (akses akun)
- Repo → Vercel; env production; `prisma db push` ke DB produksi (oleh mentor); DNS CNAME `financepro` → `cname.vercel-dns.com`; `setWebhook` Telegram **hanya setelah T-BOT-1**; jalankan uji asap di URL produksi.
- **Selesai bila:** [ ] `https://financepro.grexion.ai` melayani landing + login; [ ] cookie `secure` aktif; [ ] cron terdaftar & berjalan; [ ] rollback (redeploy versi sebelumnya) sudah dicoba.

### T-6.6 · Dokumentasi & serah terima
- ⭐ · 2–3 hari
- Perbarui `README.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md` (yang usang), `CLAUDE.md`; rekap fitur yang dibangun; daftar utang teknis tersisa; rekaman demo singkat; laporan magang untuk kampus.
- **Selesai bila:** [ ] dokumen sesuai kode terkini; [ ] orang baru bisa menjalankan proyek hanya dari README; [ ] demo dibawakan ke owner/kampus.

---

# UTANG TEKNIS (kerjakan paralel, ambil saat ada slot)

| ID | Tugas | File | Level · Estimasi | Selesai bila |
|---|---|---|---|---|
| **T-DEBT-1** | Pasang ESLint (`next/core-web-vitals`) + Prettier | root | ⭐ · 2–3 jam | `npm run lint` berjalan non-interaktif & lulus |
| **T-DEBT-2** | Validasi input dengan **Zod** di semua route (mulai auth & payments) | `app/api/**`, `lib/validators/*` | ⭐⭐ · 2–3 hari | body tak valid → 400 dengan pesan field; tidak ada `parseFloat` tanpa cek `NaN`; `any` pada body berkurang |
| **T-DEBT-3** | Helper error: log detail di server, balas pesan generik (jangan bocorkan `error.message`) | `lib/apiError.ts`, semua `catch` | ⭐⭐ · 1–2 hari | tidak ada respons 500 berisi pesan Prisma |
| **T-DEBT-4** | Perbaiki tabrakan `txId`/`invId` lintas user (`@@unique([userId, txId])` atau ID berbasis nomor acak) 🔒 | `schema.prisma`, `services.ts`, `transfer`, `debt-payments` | ⭐⭐ · 1 hari | dua user mencatat di hari yang sama tidak error |
| **T-DEBT-5** | Bungkus operasi multi-langkah saldo dengan `prisma.$transaction` 🔒 | `services.ts`, `transactions`, `transfer`, `debt-payments` | ⭐⭐⭐ · 2–3 hari | kegagalan di tengah tidak meninggalkan saldo setengah berubah (uji dengan error paksa) |
| **T-DEBT-6** | Evaluasi `Float` → `Decimal`/integer untuk uang 🔒 | schema + seluruh perhitungan | ⭐⭐⭐ · **keputusan mentor**, jangan dikerjakan sendiri | dokumen keputusan + rencana migrasi |
| **T-DEBT-7** | Test unit (Vitest) untuk `lib/utils.ts` & fungsi murni di `services.ts` | `lib/*.test.ts` | ⭐⭐ · 2 hari | `npm test` hijau; cakupan `utils.ts` ≥ 80% |
| **T-DEBT-8** | Pembersihan: hapus `lib/googleSheets.ts`, `components/` kosong, `tsconfig.tsbuildinfo` dari git (+`.gitignore`), header CORS `*` di `next.config.js`, ubah nama `/api/setup` (opsional) | root | ⭐ · 2–3 jam | build & app tetap normal |
| **T-DEBT-9** | Hilangkan N+1 di `getDebtSummaries/getAssetSummaries/getBudgetSummaries/getGoalSummaries` (`groupBy`) | `services.ts` | ⭐⭐⭐ · 3 hari | hasil identik dengan sebelum, jumlah query turun (ukur) |
| **T-DEBT-10** | Standarkan periode: bulan sebagai `YYYY-MM` (bukan "Apr 2026" berlokal), turunkan dari `date` 🔒 | schema, `utils.ts`, laporan, budget | ⭐⭐⭐ · keputusan mentor | migrasi data aman |
| **T-DEBT-11** | PWA utuh: buat `icon-192.png`, `icon-512.png`, service worker dasar | `public/`, `manifest.json` | ⭐ · 3–4 jam | Lighthouse PWA "installable" lulus |

### T-BOT-1 · Telegram multi-user & aman 🔒
- ⭐⭐⭐ · 5–6 hari · **Butuh:** P0-2, T-3.x (opsional)
- **Masalah:** bot bertindak atas nama admin pertama, tanpa whitelist & tanpa secret webhook (lihat `03_ARCHITECTURE.md` § 7).
- **Rancangan:** `User.telegramChatId String? @unique`; di Pengaturan tombol "Hubungkan Telegram" membuat kode 6 digit berumur 10 menit (`TelegramLinkCode`); di bot `/link <kode>` menautkan chat ↔ user. Semua handler memuat user dari `chatId`; chat tak dikenal → balas "Hubungkan akun dulu" dan **berhenti**. `webhookCallback(bot, 'std/http', { secretToken })` + `setWebhook` dengan `secret_token`. Batasi command PRO untuk FREE. Ganti `Map` percakapan ke penyimpanan tahan restart (tabel/Redis).
- **Selesai bila:** [ ] chat asing tidak bisa membaca/menulis data siapa pun; [ ] dua user berbeda memakai bot terpisah dan datanya tidak tercampur; [ ] request webhook tanpa secret → 401; [ ] FREE ditolak di command PRO.

---

# BAGIAN OWNER — Tambahan permintaan (T-OWN)

Daftar ini ditambahkan owner setelah audit. Beberapa butir tumpang tindih dengan task yang sudah ada; kolom **Kaitan** menunjukkan task mana yang dipakai ulang agar tidak dikerjakan dua kali. Tafsiran yang saya ambil dari catatan singkat owner ditandai ⚠ — **konfirmasi ke owner sebelum mulai**.

| ID | Tugas | Level · Estimasi | Kaitan / Butuh |
|---|---|---|---|
| **T-OWN-1** | Ganti bahasa (i18n ID/EN) | ⭐⭐ · 4–5 hari | `UserProfile` |
| **T-OWN-2** | Mata uang: kurs real-time gratis, disimpan di cloud | ⭐⭐⭐ · 5–6 hari 🔒 | P0-3, T-4.1 (cron) |
| **T-OWN-3** | Landing page | — | **sama dengan T-1.2 + T-1.3** |
| **T-OWN-4** | Memperbarui dokumen `.md` | ⭐ · 2–3 hari | **sama dengan T-6.6**, tapi dikerjakan bertahap |
| **T-OWN-5** | Pindah env ke Supabase pribadi | ⭐ · 0,5–1 hari 🔒 | P0-3 |
| **T-OWN-6** | Chatbot pencatat keuangan (opsional) | ⭐⭐⭐ · 5–7 hari | T-OWN-9, P0-2 |
| **T-OWN-7** | Notifikasi admin via email + jam kerja admin | ⭐⭐ · 3–4 hari | T-2.3, T-3.2, T-3.3 |
| **T-OWN-8** | Foto nota → transaksi (Gemini) | ⭐⭐⭐ · 6–7 hari 🔒 | P0-2, T-DEBT-2 |
| **T-OWN-9** | Bot Telegram via BotFather | ⭐⭐⭐ · 5–6 hari 🔒 | **sama dengan T-BOT-1** |

### T-OWN-1 · Ganti bahasa (Indonesia / English)
- **Langkah:** (1) pilih library (`next-intl` cocok untuk App Router; tanya mentor sebelum menambah dependency). (2) Ekstrak teks UI ke file terjemahan `messages/id.json` dan `messages/en.json`. (3) Saklar bahasa di Pengaturan dan navbar landing; simpan pilihan di `UserProfile.language` (user login) atau cookie (pengunjung). (4) Format tanggal dan angka mengikuti locale.
- **Selesai bila:** [ ] saklar mengganti seluruh teks halaman utama (landing, login, register, dashboard, transaksi, pengaturan); [ ] pilihan bertahan setelah reload; [ ] tidak ada teks yang tertinggal hardcode di halaman yang sudah dimigrasi (daftar halaman tersisa dicatat di PR); [ ] email (T-2.3) memakai bahasa pilihan user.
- **Saran:** kerjakan setelah landing page selesai, dan migrasi halaman bertahap, bukan sekaligus.

### T-OWN-2 · Mata uang: kurs real-time gratis ke cloud ⚠
- **Tafsiran:** catatan owner "ubah curse" dibaca sebagai **currency/mata uang**. Tujuannya: user bisa memilih mata uang, dan kurs diambil dari API gratis lalu disimpan di database cloud (Supabase) agar tidak memanggil API pada setiap request.
- **Sumber kurs (usulan owner):** *Free Currency Exchange Rates API* di GitHub (`fawazahmed0/exchange-api`), tanpa API key, dilayani lewat CDN. Periksa dulu URL, format respons, dan batas pemakaian di README repo tersebut; sediakan fallback bila CDN gagal.
- **Schema:** `ExchangeRate { id, base, quote, rate Float, fetchedAt }` dengan `@@unique([base, quote])`. Aktifkan `UserProfile.currency` (sudah ada di schema, belum dipakai).
- **Langkah:** (1) env baru bila perlu (`EXCHANGE_API_URL`, tanpa secret). (2) `lib/exchangeRates.ts`: ambil kurs → simpan/`upsert` ke tabel. (3) Cron harian (infra dari T-4.1) menyegarkan kurs; endpoint cron dilindungi `CRON_SECRET`. (4) `convert(amount, from, to)` membaca dari tabel, bukan dari API. (5) Tampilkan nilai di mata uang pilihan user; **data transaksi tetap disimpan dalam satu mata uang dasar (IDR)** supaya saldo tidak rusak.
- **Selesai bila:** [ ] kurs tersimpan di DB dengan `fetchedAt`; [ ] API gagal → pakai kurs terakhir dan tidak error; [ ] cron dua kali tidak menggandakan baris; [ ] user bisa memilih mata uang tampilan dan angka dashboard terkonversi benar (uji dengan kurs tetap); [ ] saldo di database tidak berubah akibat ganti mata uang tampilan.
- **Catatan:** uang saat ini `Float` (lihat T-DEBT-6). Jangan mengubah tipe kolom di task ini; konversi hanya untuk tampilan. Putuskan bersama mentor apakah impor CSV (T-5.4) ikut mendukung mata uang asing.

### T-OWN-3 · Landing page
- Tidak dibuat task baru: kerjakan **T-1.2 (wireframe/konten)** lalu **T-1.3 (implementasi)**. Tambahan dari owner: saklar bahasa (T-OWN-1) dan bagian harga yang membaca `lib/plans.ts`.

### T-OWN-4 · Memodifikasi dokumen `.md`
- **Cakupan:** `README.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `CLAUDE.md`, `AGENTS.md`, dan dokumen di `FinancePro_Intern_Handover/docs/`. Isi usang yang sudah diketahui tercantum di `06_CURRENT_STATUS.md` § D.
- **Aturan:** setiap task yang mengubah perilaku aplikasi (env baru, endpoint baru, schema baru) **memperbarui dokumen terkait di PR yang sama**; T-6.6 hanya merapikan sisanya. Jangan menaruh secret atau kredensial di dokumen.
- **Selesai bila:** [ ] dokumen cocok dengan kode terkini; [ ] daftar env di `.env.example`, `09_LOCAL_SETUP.md`, dan `DEPLOYMENT.md` sama; [ ] orang baru bisa menjalankan proyek hanya dari `README.md`.

### T-OWN-5 · Pindah ke Supabase pribadi 🔒
- **Langkah:** (1) buat project Supabase milik sendiri (jangan memakai database produksi). (2) Isi `DATABASE_URL` (dan `DIRECT_URL` bila memakai pooler) di `.env.local` milik sendiri. (3) `npx prisma db push` lalu `npm run db:seed` (setelah P0-3, seed memakai `SEED_ADMIN_*`). (4) Bila nanti memakai Storage (T-3.2), buat bucket di project yang sama.
- **Selesai bila:** [ ] aplikasi jalan penuh di database pribadi; [ ] `.env`/`.env.local` tidak ter-commit (`git status` bersih); [ ] kunci Supabase tidak muncul di chat AI, log, atau dokumen.
- **Catatan:** password database dan `service_role` key adalah secret. Jangan ditempel ke AI.

### T-OWN-6 · Chatbot pencatat keuangan (opsional) ⚠
- **Tafsiran:** user mengetik kalimat bebas ("makan siang 25rb pakai BCA") dan bot menyimpannya sebagai transaksi. Bisa lewat Telegram (T-OWN-9) atau widget chat di web; **putuskan dulu dengan owner**.
- **Rancangan:** LLM (mis. Gemini, sama dengan T-OWN-8) hanya **mengekstrak** `{type, amount, category, account, date}` menjadi JSON; transaksi dibuat lewat `createTransaction` setelah user menekan **konfirmasi**. Jangan biarkan model memanggil database langsung.
- **Selesai bila:** [ ] kalimat umum Bahasa Indonesia ("25rb", "2,5 juta") terbaca benar; [ ] ada langkah konfirmasi sebelum tersimpan; [ ] input ambigu memicu pertanyaan balik, bukan tebakan; [ ] data hanya milik user yang sedang login; [ ] batas pemakaian per user dan penanganan kegagalan API ada.

### T-OWN-7 · Notifikasi admin via email + jam kerja admin ⚠
- **Tafsiran:** setiap ada permintaan pembayaran baru (T-3.2), admin menerima **email** berisi ringkasan dan tautan ke panel approve (T-3.3). "Jam kerja admin" dibaca sebagai informasi yang ditampilkan ke user: kapan konfirmasi pembayaran diproses, serta opsi menunda email di luar jam kerja. **Konfirmasi tafsiran ini ke owner.**
- **Langkah:** (1) `ADMIN_NOTIFY_EMAIL` dan jam kerja (mis. `ADMIN_HOURS=08:00-17:00`, zona waktu WIB) di env/`lib/plans.ts`. (2) Kirim email lewat `lib/email.ts` (T-2.3) tanpa memblokir request. (3) Di halaman upgrade, tampilkan estimasi waktu konfirmasi dan jam kerja. (4) Tombol approve/reject tetap lewat panel admin (login), **bukan** tautan email yang langsung menyetujui tanpa autentikasi.
- **Selesai bila:** [ ] permintaan pembayaran baru mengirim email ke admin; [ ] gagal kirim tidak menggagalkan permintaan; [ ] jam kerja tampil benar dalam WIB (uji zona waktu); [ ] tidak ada tautan email yang bisa menyetujui pembayaran tanpa login.

### T-OWN-8 · Foto nota → transaksi (Gemini) 🔒
- **Alur:** user mengunggah foto nota → server mengirim ke Gemini (mode multimodal) → hasil JSON `{tanggal, total, merchant, item?, kategori usulan}` → **pratinjau yang bisa diedit** → user konfirmasi → `createTransaction`.
- **Aturan:** `GEMINI_API_KEY` hanya di server, bukan `NEXT_PUBLIC_`. Validasi tipe (jpg/png/webp) dan ukuran (≤ 2 MB) seperti T-3.2. Validasi keluaran model dengan Zod; angka dari model dianggap **tidak tepercaya** sampai user mengonfirmasi. Foto nota berisi data pribadi: jangan simpan permanen kecuali user memintanya, dan jangan dicatat ke log. Fitur PRO atau semua plan? **Putuskan dengan owner** (biaya API ditanggung owner).
- **Selesai bila:** [ ] 10 foto nota uji (jelas, miring, buram) menghasilkan pratinjau, dan akurasi dicatat di PR; [ ] tidak ada transaksi tersimpan tanpa konfirmasi; [ ] nota tak terbaca → pesan ramah, bukan error mentah; [ ] kunci API tidak muncul di bundle client (`npm run build` lalu cari kunci); [ ] ada batas pemakaian per user per hari.
- **Catatan:** cek kebijakan data dan kuota free tier Gemini sebelum dipakai untuk data pengguna sungguhan.

### T-OWN-9 · Bot Telegram via BotFather 🔒
- **Sama dengan T-BOT-1** (multi-user, penautan `/link <kode>`, secret webhook, tanpa akses chat asing). Tambahan dari owner: dokumentasikan langkah membuat bot di BotFather (`/newbot`, ambil token, `/setcommands`, `/setdescription`) di `09_LOCAL_SETUP.md`.
- **Aturan:** token bot adalah secret; bila pernah tertempel di chat/git, buat ulang lewat BotFather (`/revoke`). `setWebhook` hanya setelah T-BOT-1 selesai (lihat T-6.5). Bot ini juga menjadi saluran untuk T-OWN-6 dan, bila disetujui, T-OWN-8.

---

## Ide tambahan (setelah semua di atas; diskusikan prioritas dengan owner)

Midtrans (pembayaran otomatis) · verifikasi email · login Google · multi-mata-uang (aktifkan `UserProfile.currency`) · kategori ikon (`Category.icon`) · tren net worth · notifikasi budget via Telegram/email · rekonsiliasi saldo (hitung ulang `Account.balance` dari transaksi) · mode gelap/terang penuh · aplikasi mobile (PWA→Capacitor).
