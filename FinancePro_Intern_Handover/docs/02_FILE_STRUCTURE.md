# 02 — Struktur File

Jumlah kode: ±7.700 baris TypeScript/TSX. Tidak ada file test. `components/` di root **kosong** (komponen bersama ada di `app/components/`).

## Pohon folder (beranotasi)

```
financepro/
├── middleware.ts               Penjaga halaman /dashboard & /transactions (Edge, pakai jose)
├── next.config.js              Header CORS untuk /api/* (lihat 06: perlu dirapikan)
├── tailwind.config.ts          Warna primary/success/warning/danger, darkMode: 'class'
├── tsconfig.json               Alias import: '@/...' = root proyek
├── package.json                Script: dev, build, db:push, db:seed, db:studio
├── CLAUDE.md / AGENTS.md       Konteks untuk AI (ganti dengan versi di ai-context/)
├── README.md ARCHITECTURE.md DEPLOYMENT.md   ⚠ SUDAH USANG (masih single-user, sebut Google Sheets)
│
├── prisma/
│   ├── schema.prisma           11 model + 6 enum (lihat 04_DATABASE.md)
│   └── seed.ts                 Buat akun admin + kategori + data demo (⚠ password tertanam)
│
├── lib/                        ← logika non-UI
│   ├── auth.ts                 getUserFromRequest, requireAuth, requireAdmin, isPro  (isPro BELUM dipakai di mana pun)
│   ├── db.ts                   Singleton PrismaClient
│   ├── services.ts             389 baris: transaksi, savings, hutang, aset, budget, goal, laporan, dashboard
│   ├── utils.ts                Format Rupiah, parse tanggal, ID (TRX-/INV-), status budget/goal, parser input bot
│   ├── telegramBot.ts          462 baris: semua command bot (grammy)
│   └── googleSheets.ts         ☠ STUB MATI (6 baris, semua komentar) — aman dihapus
│
├── types/index.ts              Interface input & summary (TransactionInput, DebtSummary, DashboardData, ...)
│
├── app/
│   ├── layout.tsx              Root layout: font Inter, <html class="dark">, <Providers>, metadata PWA
│   ├── providers.tsx           ThemeProvider (useTheme) + ToastProvider (useToast)
│   ├── auth-context.tsx        AuthProvider + useAuth() → { isAuthenticated, username, role, plan, login, logout }
│   ├── hooks.ts                useSetupData(): cache kategori/rekening/goal/hutang/aset untuk dropdown form
│   ├── globals.css             Kelas komponen: .card .card-hover .kpi-card .btn-primary .btn-secondary
│   │                           .input-field .form-label .badge-success/-warning/-danger, animasi toast
│   ├── page.tsx                "/" — layout landing SUDAH ADA tapi useEffect langsung redirect (lihat 06)
│   ├── login/page.tsx          Form login
│   ├── register/page.tsx       Form daftar → sukses → redirect ke /login setelah 2 detik (tidak auto-login)
│   ├── transactions/           Halaman transaksi (layout.tsx cuma 2 baris; page.tsx 505 baris)
│   ├── components/
│   │   ├── ProGate.tsx         Layar kunci "Fitur PRO" (client-side saja)
│   │   └── RpInput.tsx         Input nominal berformat Rupiah
│   ├── dashboard/
│   │   ├── layout.tsx          Sidebar, badge plan, banner upgrade, toggle tema
│   │   ├── page.tsx            Dashboard utama (recharts)
│   │   ├── rekening/           Rekening + transfer
│   │   ├── savings/ debts/ assets/ budget/ goals/ reports/   Halaman PRO (early-return <ProGate>)
│   │   ├── settings/           Profil, kategori, rekening (497 baris)
│   │   ├── upgrade/            Kartu harga FREE vs PRO + cara bayar manual
│   │   └── admin/              Kelola user (ADMIN only, 405 baris)
│   └── api/                    ← REST endpoint (1 folder = 1 resource, file route.ts)
│       ├── auth/{login,logout,register,verify,seed}/
│       ├── transactions/ accounts/ categories/ transfer/
│       ├── savings/ debts/ debt-payments/ assets/ budget/ goals/
│       ├── dashboard-data/ reports/
│       ├── setup/              ⚠ nama menyesatkan: ini API profil+kategori+rekening (untuk dropdown & settings)
│       ├── admin/users/
│       └── webhook/            Endpoint Telegram
│
└── public/
    ├── icon.svg
    └── manifest.json           Merujuk /icon-192.png & /icon-512.png yang TIDAK ADA (PWA belum utuh)
```

## Ukuran file terbesar (tempat kompleksitas)

| File | Baris | Catatan |
|---|---|---|
| `app/transactions/page.tsx` | 505 | Transaksi (filter, cari, paginasi) |
| `app/dashboard/settings/page.tsx` | 497 | Profil + CRUD kategori & rekening + modal |
| `lib/telegramBot.ts` | 462 | Semua command + state percakapan in-memory |
| `app/dashboard/debts/page.tsx` | 447 | Hutang, piutang, pembayaran |
| `app/dashboard/admin/page.tsx` | 405 | Panel admin |
| `lib/services.ts` | 389 | Inti logika bisnis |

Aturan proyek: file ideal < 400 baris, maksimum 800. File di atas ±450 baris layak dipecah saat kamu menyentuhnya untuk fitur baru (bukan refactor terpisah).

## Cheat sheet: "Mau ubah X → buka Y"

| Mau… | Buka |
|---|---|
| Ubah aturan plan/role (siapa boleh apa) | `lib/auth.ts` (+ API terkait, + `ProGate.tsx` untuk tampilan) |
| Tambah/ubah tabel database | `prisma/schema.prisma` → `npx prisma db push` (lokal!) |
| Tambah endpoint | `app/api/<nama>/route.ts` — salin pola dari `app/api/goals/route.ts` |
| Tambah halaman dashboard | `app/dashboard/<nama>/page.tsx` + entri di `allNavItems` di `app/dashboard/layout.tsx` |
| Kunci halaman untuk PRO | Early return `<ProGate feature="…" />` di halaman **dan** cek `isPro(user)` di API-nya |
| Hitung angka baru (KPI, laporan) | `lib/services.ts` (jangan hitung di komponen) |
| Format Rupiah / tanggal / ID | `lib/utils.ts` (`formatCurrency`, `parseDate`, `getMonthString`, …) |
| Ubah warna/komponen umum (tombol, kartu, input) | `app/globals.css` (`@layer components`) |
| Tampilkan notifikasi toast | `const { toast } = useToast()` dari `app/providers.tsx` |
| Ambil data dropdown (kategori/rekening) | `useSetupData()` dari `app/hooks.ts` |
| Tambah command Telegram | `lib/telegramBot.ts` |
| Ubah rute yang dilindungi login | `PROTECTED_ROUTES` di `middleware.ts` |
| Ubah teks/harga di halaman upgrade | `app/dashboard/upgrade/page.tsx` (nomor WA masih placeholder `628xxxxxxxxxx`, rekening BCA placeholder) |
| Tambah env var | `templates/.env.example` + `docs/09_LOCAL_SETUP.md` |

## File yang JANGAN kamu sentuh tanpa bicara ke mentor

`middleware.ts` · `lib/auth.ts` · `prisma/schema.prisma` · `app/api/auth/*` · `app/api/admin/*` · `next.config.js` · `package.json` (dependency baru)

Bukan dilarang — tapi perubahan di sini memengaruhi keamanan/seluruh user, jadi wajib review.
