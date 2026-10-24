# 06 — Status Saat Ini (Hasil Audit)

Audit: 29 September 2026 · commit `f95acfd` · membaca seluruh `lib/`, `middleware.ts`, `prisma/`, seluruh `app/api/`, dan halaman kunci. `npx tsc --noEmit` → **lulus (0 error)**. Aplikasi belum pernah dijalankan end-to-end dalam audit ini (pemeriksaan dilakukan lewat pembacaan kode); uji manual tetap wajib.

> **Kesimpulan singkat:** fitur inti (transaksi, rekening, hutang, aset, budget, goals, laporan, dashboard, admin) **sudah ada dan tampak lengkap**. Yang belum ada adalah semua yang membuat produk **layak dijual & aman**: landing page, email, trial, pembayaran, kedaluwarsa plan, dan **penegakan aturan plan di server**. Ditambah beberapa celah keamanan yang harus ditutup sebelum rilis.

Ikon: ✅ selesai · 🟡 sebagian · ❌ belum ada · 🐞 ada bug.

---

## A. Temuan kritis (blocker sebelum rilis publik)

| # | Temuan | Bukti | Dampak | Task |
|---|---|---|---|---|
| 1 | 🐞 **Password admin & JWT secret tertanam di source/git** | `prisma/seed.ts:11`, `app/api/auth/seed/route.ts:7`, `CLAUDE.md`, `AGENTS.md` | Siapa pun yang punya repo bisa login sebagai admin bila password belum diganti | P0-3 (+ checklist owner di README) |
| 2 | 🐞 **Gating PRO hanya di client** | `isPro()` di `lib/auth.ts` tidak dipanggil di mana pun; 0 pemeriksaan plan di `savings/debts/debt-payments/assets/budget/goals/reports` | User FREE bisa memakai semua fitur PRO via API/DevTools → tidak ada alasan membayar | P0-2 |
| 3 | 🐞 **IDOR di 5 handler** | `accounts` PATCH+DELETE, `categories` PATCH+DELETE, `debts` PATCH tidak memeriksa kepemilikan | User A bisa mengubah/menghapus rekening/kategori/hutang user B jika tahu ID (cuid sulit ditebak, tapi ID bisa bocor lewat log/URL/bug lain) | P0-1 |
| 4 | 🐞 **`/api/auth/seed` publik** dan membuat akun "admin" tanpa role ADMIN | `app/api/auth/seed/route.ts` (tidak ada cek auth; `create` tanpa `role`) | Endpoint sensitif terbuka; hasilnya juga salah | P0-3 |
| 5 | 🐞 **`JWT_SECRET` punya fallback default** | 4 file (`login`, `verify`, `lib/auth.ts`, `middleware.ts`) | Lupa set env di produksi → token bisa dipalsukan | P0-3 |
| 6 | 🐞 **Bot Telegram tanpa otorisasi** | `lib/telegramBot.ts:21` (admin pertama), tanpa whitelist chat & tanpa secret webhook | Siapa pun yang menemukan bot mengakses data admin | T-BOT-1 (jangan aktifkan webhook produksi dulu) |
| 7 | 🐞 **Plan tidak pernah kedaluwarsa & basi di token** | `planExpiresAt` tidak dibaca; `plan` di-embed 30 hari di JWT | PRO gratis selamanya; upgrade/downgrade tidak langsung berlaku | P0-4, T-4.1 |
| 8 | 🐞 **Tidak ada rate limit** login/register | — | Brute-force password, spam pendaftaran | P0-5 |

## B. Fitur — apa yang benar-benar ada

### Sudah selesai ✅
- Login / logout, JWT cookie, middleware penjaga halaman
- **Pendaftaran publik** (`/register`): validasi dasar, hash password, plan `FREE`
- Multi-user dengan pemisahan data per `userId` (kecuali 5 handler di atas)
- **Admin Panel**: daftar user, buat user, edit nama/role/plan/kedaluwarsa/password, hapus user, tombol cepat PRO/FREE
- **Transaksi**: CRUD, kategori/rekening otomatis, **cari + filter (tanggal, jenis, kategori) + paginasi sisi server** (25/halaman) — *item roadmap lama "Search & pagination transaksi" sebenarnya sudah selesai*
- **Rekening**: CRUD, koreksi saldo dengan riwayat (`adjustments`), transfer antar rekening
- **Nabung & Investasi**, **Hutang & Piutang** (Revolving/Fixed + pembayaran), **Aset** (P&L), **Budget**, **Goals**, **Laporan** harian/mingguan/bulanan
- **Dashboard**: KPI, grafik arus kas, top kategori, ringkasan budget/investasi/goals, tips otomatis; **filter rentang tanggal manual**
- Settings (profil, kategori, rekening), halaman Upgrade (harga + cara bayar manual), badge/banner plan di sidebar, `ProGate`
- Tema gelap/terang, toast, format Rupiah `Rp1.234.567`
- Telegram bot dasar (kode lengkap, tapi lihat celah keamanan)

### Setengah jadi 🟡
| Item | Yang ada | Yang kurang |
|---|---|---|
| Landing page `/` | Komponen tampilan (navbar, hero, grid 8 fitur, footer) sudah ditulis di `app/page.tsx` | Halaman langsung **redirect** ke `/dashboard` atau `/login` lewat `useEffect` sehingga tampilan tidak pernah terlihat; tidak ada bagian harga, CTA "Daftar", tautan legal; 🐞 kelas Tailwind dinamis `bg-${color}-500/20` (baris 88–89) tidak akan ter-generate di production |
| PWA | `manifest.json`, `icon.svg`, meta tag | File `icon-192.png` & `icon-512.png` yang dirujuk manifest **tidak ada**; tidak ada service worker → belum bisa di-install/offline dengan baik |
| Free vs PRO | Halaman terkunci di client, halaman harga, banner | Server tidak memeriksa; batas 1 rekening & "dashboard bulan berjalan" tidak ada |
| Cara bayar | Teks instruksi di `/dashboard/upgrade` | Nomor WhatsApp masih placeholder `628xxxxxxxxxx`; rekening BCA placeholder; semua manual lewat admin |
| Seed | `prisma/seed.ts` membuat admin + kategori + data demo | Password tertanam; jangan dijalankan ke DB bersama |
| Dokumentasi lama | `README.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md` | **Usang**: masih menganggap aplikasi single-user, menyebut Google Sheets, `JWT_SECRET` tidak ada di daftar env |

### Belum ada ❌ (roadmap produk)
Email (welcome, reset password, notifikasi) · Free trial 14 hari otomatis · Sistem permintaan pembayaran (upload bukti + approve admin) · Auto-downgrade saat kedaluwarsa · Email pengingat perpanjangan · Halaman legal (ToS, Privacy Policy) · Onboarding user baru · Transaksi berulang · Net Worth di dashboard · Preset rentang tanggal cepat di dashboard · Import CSV/Excel · Export PDF/Excel · Error tracking (Sentry) · Rate limiting · Admin analytics (MRR, user aktif, konversi) · Email digest mingguan · Telegram multi-user · Test otomatis · ESLint · Deployment ke Vercel.

## C. Kesehatan kode

| Aspek | Kondisi |
|---|---|
| Type-check | ✅ lulus |
| Test otomatis | ❌ tidak ada satu pun (tidak ada Jest/Vitest/Playwright) |
| Lint | ❌ tidak ada konfigurasi ESLint (`npm run lint` akan meminta setup interaktif) |
| Validasi input | 🟡 manual & minimal; tidak ada Zod; `parseFloat` tanpa cek `NaN` |
| Tipe `any` | 🟡 ±99 kemunculan (`catch (error: any)`, `where: any`, dll.) |
| `console.log` | ✅ 0 di `app/` & `lib/` (seed.ts memakainya — wajar) |
| Atomisitas | 🐞 0 pemakaian `prisma.$transaction`; update saldo multi-langkah bisa setengah jadi |
| Performa | 🟡 pola N+1 di `services.ts` (loop + `aggregate` per hutang/aset/budget/goal); `getMonthlyReport` memuat semua `savingsInvestment` lalu difilter di memori |
| Pengambilan data client | 🟡 `fetch` di `useEffect` di setiap halaman, tanpa cache/dedup |
| Konsistensi | 🐞 `txId` unik global tapi nomor urut per-user → bisa bertabrakan antar user pada hari yang sama |
| Header CORS | 🟡 `next.config.js` memasang `Access-Control-Allow-Origin: *` di semua `/api/*` — tidak perlu (aplikasi same-origin) dan sebaiknya dihapus |
| Berkas usang | `lib/googleSheets.ts` (stub mati), `components/` kosong di root, `tsconfig.tsbuildinfo` ikut ter-commit (harus di-`.gitignore`) |
| Git | 2 commit; `AGENTS.md` & `CLAUDE.md` belum ter-track; belum ada remote |

## D. Koreksi terhadap dokumen lama

| Klaim lama | Kenyataan |
|---|---|
| "Free trial 14 hari … `[x]`" di daftar fitur `CLAUDE.md` | **Belum ada** (dokumen sendiri menyebut "BELUM DIIMPLEMENTASI"); centang `[x]` menyesatkan |
| "Landing page publik (/) — belum ada" | Kerangka tampilan sudah ada tetapi tersembunyi oleh redirect |
| "Search & pagination transaksi — belum" | **Sudah ada** |
| "Pro-only API: tambahkan cek `isPro(user)`" (konvensi) | **Tidak dijalankan** di API mana pun |
| "Semua Prisma query WAJIB filter `userId`" | Benar sebagai aturan; **dilanggar** di 5 handler |
| "FREE = 1 Rekening" | Tidak ditegakkan |
| `ARCHITECTURE.md`: multi-user = "easy upgrade nanti" | Sudah multi-user |
| `.env.local.example` memuat `API_SECRET` | Tidak dipakai kode; sebaliknya `JWT_SECRET` dipakai tapi tidak tercantum |

## E. Urutan kerja yang disarankan

1. **Minggu 1–2 (bersama mentor):** P0-1 … P0-5 (keamanan & gating server). Kecil, mengajarkan seluruh pola kode, dan wajib sebelum rilis.
2. **Bulan 1–2:** landing page, legal, onboarding, email, reset password.
3. **Bulan 3–4:** trial, pembayaran manual, kedaluwarsa plan, reminder, analytics.
4. **Bulan 5–6:** fitur produktivitas, import/export, Sentry, QA (Playwright), deploy.

Detail lengkap ada di `07_TASK_BACKLOG.md`.
