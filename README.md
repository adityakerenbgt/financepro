# FinancePro — Personal Finance Manager

Aplikasi manajemen keuangan pribadi berbasis Next.js dengan Telegram Bot integration.

## Features

- **Transaksi** — Catat pemasukan & pengeluaran harian
- **Nabung & Investasi** — Tracking portofolio investasi dan tabungan goals
- **Utang** — Revolving (CC, Paylater) dan Fixed (KPR, KKB)
- **Aset** — Net worth dan unrealized P&L
- **Budget** — Budget vs realisasi per kategori per bulan
- **Goals** — Target tabungan dengan progress tracking
- **Laporan** — Harian, Mingguan, Bulanan
- **Dashboard** — KPI cards, charts, auto-generated tips
- **Telegram Bot** — Semua fitur via chat bot

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd financepro
npm install
```

### 2. Setup Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://user:password@host:5432/financepro"
TELEGRAM_BOT_TOKEN=your_bot_token_here
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

**Untuk development lokal**, gunakan database lokal atau Supabase free tier:
- Supabase: https://supabase.com → New Project → Settings → Database → Connection String

### 3. Setup Database

```bash
# Push schema ke database
npm run db:push

# (Opsional) Isi dengan data demo
npm run db:seed
```

### 4. Jalankan Dev Server

```bash
npm run dev
```

Buka http://localhost:3000

---

## Getting a Telegram Bot Token

1. Buka Telegram, cari `@BotFather`
2. Kirim `/newbot`
3. Ikuti instruksi, masukkan nama bot
4. Copy token yang diberikan ke `TELEGRAM_BOT_TOKEN`

---

## Deploy ke Vercel

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk panduan lengkap.

---

## Database Options

| Provider | Free Tier | Latency |
|----------|-----------|---------|
| **Supabase** (recommended) | 500MB, unlimited API | Low |
| **Neon** | 512MB, serverless | Low |
| **Railway** | $5/mo free credit | Low |
| **Vercel Postgres** | 256MB | Very low |

---

## Telegram Bot Commands

| Command | Keterangan |
|---------|-----------|
| `/start` | Welcome & menu utama |
| `/help` | Semua perintah |
| `/add` | Tambah transaksi (multi-step) |
| `/transaksi` | Lihat 10 transaksi terakhir |
| `/templatetransaksi` | Format input transaksi |
| `/nabung` | Catat nabung/investasi |
| `/templateinvestasi` | Format input investasi |
| `/hutang` | Ringkasan utang |
| `/bayar` | Bayar utang |
| `/aset` | Ringkasan aset |
| `/budget` | Budget vs aktual |
| `/goals` | Progress goals |
| `/harian` | Laporan harian |
| `/mingguan` | Laporan mingguan |
| `/bulanan` | Laporan bulanan |
| `/dashboard` | Link ke web dashboard |

---

## Project Structure

```
financepro/
├── app/
│   ├── api/                    # Next.js API routes
│   │   ├── transactions/       # GET & POST transaksi
│   │   ├── savings/            # GET & POST nabung/investasi
│   │   ├── debts/              # GET & POST utang
│   │   ├── assets/             # GET, POST & PATCH aset
│   │   ├── budget/             # GET & POST budget
│   │   ├── goals/              # GET & POST goals
│   │   ├── reports/            # GET laporan harian/mingguan/bulanan
│   │   ├── dashboard-data/     # GET data untuk dashboard
│   │   ├── setup/              # GET & POST profil/kategori/rekening
│   │   └── webhook/            # POST Telegram webhook
│   ├── dashboard/              # Dashboard pages
│   │   ├── page.tsx            # Main dashboard
│   │   ├── layout.tsx          # Sidebar nav
│   │   ├── savings/            # Halaman nabung
│   │   ├── debts/              # Halaman utang
│   │   ├── assets/             # Halaman aset
│   │   ├── budget/             # Halaman budget
│   │   ├── goals/              # Halaman goals
│   │   ├── reports/            # Halaman laporan
│   │   └── settings/           # Halaman pengaturan
│   ├── transactions/           # Halaman transaksi
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
├── lib/
│   ├── db.ts                   # Prisma client singleton
│   ├── services.ts             # Business logic layer
│   ├── telegramBot.ts          # grammY bot handlers
│   └── utils.ts                # Helper functions
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data
├── types/
│   └── index.ts                # TypeScript interfaces
└── .env.local.example          # Environment template
```

---

## Questions for Client

1. **Multi-user support** — Saat ini app ini single-user. Apakah perlu sistem login/multi-akun untuk dijual ke banyak klien?
2. **Google Sheets sync** — Apakah perlu sinkronisasi dua arah dengan Google Sheets yang sudah ada?
3. **Telegram user authorization** — Apakah bot harus dibatasi hanya untuk Telegram user ID tertentu?
4. **Currency** — Apakah perlu multi-currency dengan konversi otomatis?
5. **Backup** — Apakah perlu fitur export ke CSV/Excel?
6. **Notifikasi** — Apakah bot perlu mengirim notifikasi otomatis (misal: reminder bayar tagihan, over budget)?
7. **White-label** — Untuk dijual ke klien, apakah nama "FinancePro" bisa diganti?
