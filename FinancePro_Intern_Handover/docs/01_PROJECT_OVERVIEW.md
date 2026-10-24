# 01 — Ringkasan Proyek

## Apa itu FinancePro?

Aplikasi web manajemen keuangan pribadi untuk pasar umum Indonesia. User mencatat pemasukan/pengeluaran, memantau rekening, tabungan & investasi, hutang/piutang, aset, budget, dan goals — lewat web dashboard dan (terbatas) Telegram bot.

- **Domain rencana:** `financepro.grexion.ai`
- **Model bisnis:** freemium (FREE + PRO), pembayaran manual transfer bank dulu, Midtrans nanti.
- **Status:** aplikasi inti berjalan; **belum layak rilis publik** (lihat `06_CURRENT_STATUS.md`).
- **Pemilik/Admin:** Virgian Galang Sasongko (Direktur, PT Teknologi Cuan Besar / SDS IT Consulting).

## Paket & harga

| | FREE | PRO |
|---|------|-----|
| Harga | Rp 0 | Rp 29.000/bulan atau Rp 249.000/tahun |
| Transaksi | ✅ (tanpa batas) | ✅ |
| Dashboard | bulan berjalan | ✅ semua periode |
| Rekening | 1 | tak terbatas |
| Laporan | sederhana | harian, mingguan, bulanan |
| Nabung & Investasi, Hutang & Piutang, Aset, Goals, Budget | ❌ terkunci (`ProGate`) | ✅ |
| Telegram bot | dasar | semua fitur |

> Catatan penting: tabel di atas adalah **niat produk**. Yang benar-benar ditegakkan kode saat ini hanya penguncian **halaman** PRO di sisi client. Batas "1 rekening", "dashboard bulan berjalan", dan pemeriksaan plan di API **belum ada**. Lihat `06_CURRENT_STATUS.md` § "Temuan kritis".

`ADMIN` selalu diperlakukan sebagai PRO.

## Tech stack (versi terpasang)

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js **14.2.35** (App Router), React **18.3.1**, TypeScript 5 |
| Styling | Tailwind CSS 3, `lucide-react` (ikon), `recharts` (grafik) |
| Database | PostgreSQL (Supabase) via Prisma **5.22** |
| Auth | JWT di cookie httpOnly `auth-token` (30 hari). `jsonwebtoken` di API, `jose` di middleware (Edge) |
| Password | `bcryptjs` (cost 10) |
| Bot | `grammy` (webhook di `/api/webhook`) |
| Tanggal | `date-fns` (locale Indonesia) |
| Hosting (rencana) | Vercel (app) + Supabase (DB) |

**Tidak ada** (belum dipasang): library validasi (Zod), data-fetching cache (SWR/React Query), test framework, ESLint config, error tracking, email provider, payment gateway.

## Peran pengguna

- **USER** — akun biasa (mendaftar di `/register`, plan awal FREE).
- **ADMIN** — pemilik. Akses Admin Panel (`/dashboard/admin`) untuk membuat user, ubah plan FREE/PRO, atur tanggal kedaluwarsa, hapus user. Telegram bot saat ini bekerja **atas nama admin pertama** (lihat `03_ARCHITECTURE.md`).

## Peta halaman (URL → fungsi)

| URL | Akses | Fungsi |
|---|---|---|
| `/` | publik | Halaman beranda — **saat ini langsung redirect** ke `/dashboard` atau `/login` (belum jadi landing page) |
| `/login`, `/register` | publik | Masuk / daftar |
| `/dashboard` | login | KPI, grafik arus kas, ringkasan budget/investasi/goals, tips otomatis |
| `/transactions` | login | CRUD transaksi + filter + cari + paginasi |
| `/dashboard/rekening` | login | Rekening + transfer antar rekening |
| `/dashboard/savings` | login, PRO* | Nabung & investasi |
| `/dashboard/debts` | login, PRO* | Hutang & piutang + pembayaran |
| `/dashboard/assets` | login, PRO* | Aset & untung/rugi |
| `/dashboard/budget` | login, PRO* | Budget per kategori per bulan |
| `/dashboard/goals` | login, PRO* | Target tabungan |
| `/dashboard/reports` | login, PRO* | Laporan harian/mingguan/bulanan |
| `/dashboard/settings` | login | Profil, kategori, rekening |
| `/dashboard/upgrade` | login | Halaman harga & cara upgrade manual |
| `/dashboard/admin` | ADMIN | Kelola user & plan |

\* dikunci di client oleh `ProGate`; API-nya belum dikunci.

## Cara berpikir tentang proyek ini

1. **Monolit sederhana:** satu repo Next.js = frontend + API + bot. Tidak ada service terpisah.
2. **Halaman = client component** yang `fetch('/api/...')` di `useEffect`. Hampir semua halaman di `app/dashboard/*` bertipe `'use client'`.
3. **Logika bisnis** (hitung saldo hutang, P&L aset, status budget, dll.) ada di `lib/services.ts` supaya dipakai bersama oleh API route dan Telegram bot.
4. **Bahasa:** UI & pesan error dalam Bahasa Indonesia; nama variabel/kode dalam Bahasa Inggris. Data enum tertentu berbahasa Indonesia (`Pemasukan`, `Pengeluaran`, `Lunas`, `Tercapai`).
