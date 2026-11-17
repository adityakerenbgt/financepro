# BUG LOG & Laporan QA (T-6.3 / T-6.4)

Terakhir diperbarui: 17 Nov 2026.

## Hasil uji otomatis
- `npm run test:unit` — 47 tes (parser, net worth, recurring, jam admin, pembersih Sentry). Hijau.
- `npm run test:api` — 13 skenario integrasi terhadap server nyata + DB (`tests/api/e2e.test.ts`). Hijau (13/13).
  Skenario: register & validasi, rate limit login/register, API tanpa login, CRUD transaksi + saldo, FREE vs PRO, trial berakhir, admin ubah plan, IDOR dua user (transaksi/utang/rekening/ekspor/dashboard), pembayaran approve/tolak, reset password sekali pakai, cron & webhook tertutup, tautan Telegram, ekspor.
- Cara menjalankan: `npm run dev` di satu terminal, lalu `npm run test:api` (memakai DB di `.env`; data uji berawalan `uji_api_` dihapus otomatis). **Bukan Playwright** (UI tidak diuji otomatis; diperiksa manual di browser).
- CI GitHub Actions + DB uji terpisah: belum dibuat (perlu keputusan owner soal DB uji).

## Temuan
| # | Tingkat | Temuan | Status |
|---|---|---|---|
| 1 | **Kritikal** | Next.js 14.2.35 punya advisory kritikal/tinggi (RCE pada Image Optimizer, DoS Server Components/Actions, SSRF) yang hanya diperbaiki di 15.5.28+. | **Ditutup**: upgrade ke Next 15.5.29 + React 19 + lucide-react 0.469 (`cookies()`/`params` dibuat async). `npm audit --omit=dev`: kritikal 0. |
| 2 | Sedang | Tidak ada header keamanan. | **Ditutup**: CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS; `X-Powered-By` dimatikan. Diuji tanpa pelanggaran CSP di dashboard, transaksi, upgrade. |
| 3 | Rendah | `/api/admin/users` mengembalikan 403 (bukan 401) tanpa login; semua 500 route mengembalikan `error.message` mentah (bisa membocorkan detail Prisma). | **Ditutup** (T-DEBT-3): `serverError()` + `requireAdminUser`. |
| 7 | **Tinggi** | Ubah transaksi ke rekening baru yang ditolak batas paket FREE meninggalkan saldo rekening lama rusak (saldo dibalik sebelum validasi, tanpa rollback). Juga transaksi+saldo tidak atomik di create/hapus/transfer/bayar utang. | **Ditutup** (T-DEBT-5): validasi dulu, lalu satu `$transaction`. Tes 14 gagal di kode lama (0 ≠ -10000), lulus di kode baru. |
| 4 | Rendah | `npm audit` masih 3 "high" transitif **hanya saat build** (`@sentry/nextjs`→rollup, postcss di dalam Next). Tidak ikut berjalan di runtime produksi. | Diterima; perbaikannya butuh Sentry 11 / Next 16 (major). |
| 5 | Info | Rate limit memakai memori proses bila Upstash belum diset → tidak efektif di Vercel serverless. | Terbuka: isi `UPSTASH_REDIS_REST_URL/TOKEN` sebelum produksi. |
| 8 | Rendah | `/api/debt-payments` memakai `isPiutang`/`debtName` dari body klien untuk menentukan kategori & arah transaksi. | **Ditutup**: diambil dari record utang di database. |
| 9 | Rendah | JWT milik akun yang sudah dihapus tetap berlaku sampai 30 hari; rute yang hanya memakai `getUserFromRequest` (tanpa cek DB) merespons 500 generik (FK) alih-alih 401. Tidak ada akses data. | Terbuka (pakai `getCurrentUser` di rute tersisa / cek di middleware). |
| 6 | Info | Dev server Next 15 sempat restart sendiri ("approaching memory threshold") saat suite panjang; hanya mode dev. | Dicatat. |

## Checklist kesiapan produksi (T-6.4)
- [x] `npm run build` bersih (hanya peringatan dari `jose`/OpenTelemetry).
- [x] Tidak ada `console.log` sisa (satu log dev-only di forgot-password, hanya aktif di `NODE_ENV=development` tanpa Resend).
- [x] Header keamanan; CORS `*` sudah dihapus.
- [x] `npm audit`: kritikal 0 (lihat temuan #4).
- [ ] Semua env produksi terisi — lihat `.env.local.example` (RESEND_API_KEY, EMAIL_FROM, UPSTASH_*, TELEGRAM_WEBHOOK_SECRET, SENTRY_*, CRON_SECRET baru, ADMIN_NOTIFY_EMAIL).
- [ ] Backup DB Supabase aktif (cek di dashboard Supabase; owner).
- [ ] Ganti kredensial yang pernah tertempel di chat/git (password DB, service-role key, password admin lama).
- [ ] Uji di perangkat mobile sungguhan (owner).
- [ ] Tanda tangan mentor.
