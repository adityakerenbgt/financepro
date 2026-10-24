# 03 — Arsitektur & Cara Kerja

## 1. Alur besar

```
Browser (halaman 'use client')            Telegram
        │  fetch('/api/...')                 │  POST /api/webhook
        ▼                                    ▼
┌─────────────────────────────────────────────────────┐
│ middleware.ts (Edge, jose)                          │  ← hanya menjaga HALAMAN /dashboard, /transactions
└─────────────────────────────────────────────────────┘
        ▼
app/api/*/route.ts  (Node runtime, jsonwebtoken)
   1. getUserFromRequest(req) → 401 kalau null
   2. validasi input manual
   3. panggil lib/services.ts  (atau Prisma langsung)
        ▼
lib/services.ts  → Prisma → PostgreSQL (Supabase)
```

Catatan: `middleware.ts` **tidak** melindungi `/api/*`. Setiap API route wajib memeriksa auth sendiri lewat `getUserFromRequest`. (Route yang sengaja tanpa cek: `auth/login`, `auth/logout`, `auth/register`, `auth/seed`, `auth/verify`, `webhook`.)

## 2. Autentikasi (end-to-end)

1. `POST /api/auth/login` → cek `username` + `bcrypt.compare` → buat JWT `{ userId, username, role, plan }`, kedaluwarsa 30 hari → simpan di cookie `auth-token` (`httpOnly`, `sameSite=lax`, `secure` di production).
2. **Halaman:** `middleware.ts` membaca cookie, verifikasi dengan **`jose`** (`jwtVerify`), redirect ke `/login` bila gagal. Kalau sudah login dan buka `/login` → redirect ke `/dashboard`.
3. **API:** `getUserFromRequest(req)` di `lib/auth.ts` memverifikasi dengan **`jsonwebtoken`** dan mengembalikan `AuthUser` atau `null`.
4. **Client:** `AuthProvider` (`app/auth-context.tsx`) memanggil `GET /api/auth/verify` saat mount untuk mengisi `role` & `plan` ke context.

**Kenapa dua library JWT?** Edge Runtime (middleware) tidak mendukung `jsonwebtoken`; `jose` mendukung keduanya. Jangan impor `jsonwebtoken` di `middleware.ts`. Secret yang sama (`JWT_SECRET`) dipakai keduanya.

### Kelemahan yang harus kamu pahami

- **`plan` "dibekukan" di dalam token selama 30 hari.** Admin mengubah user ke PRO → user tidak melihat perubahan sampai login ulang. `GET /api/auth/verify` membaca dari token, bukan dari database.
- **`planExpiresAt` tidak pernah dibaca oleh kode mana pun** selain tampilan admin. Plan PRO tidak akan pernah kedaluwarsa otomatis.
- **`JWT_SECRET` punya nilai fallback** (`'your-secret-key-change-in-env'`) di 4 tempat. Bila env lupa diisi, token bisa dipalsukan. (Lihat P0-3.)

## 3. Role & Plan (gating)

```
UserRole: ADMIN | USER        UserPlan: FREE | PRO
isPro(user) = role === 'ADMIN' || plan === 'PRO'      (lib/auth.ts — belum dipanggil di mana pun)
```

| Lapisan | Kondisi saat ini |
|---|---|
| **Tampilan** (client) | ✅ Ada. `ProGate` + early return `if (role !== 'ADMIN' && plan !== 'PRO') return <ProGate …/>` di 6 halaman PRO; sidebar menampilkan badge & banner upgrade |
| **API** (server) | ❌ **Tidak ada.** Endpoint `savings`, `debts`, `debt-payments`, `assets`, `budget`, `goals`, `reports` hanya cek login. User FREE yang memanggil API langsung tetap dapat data/menulis data |
| **Batas kuantitas** | ❌ "1 rekening untuk FREE" tidak ditegakkan (`POST /api/accounts` tidak membatasi) |

Artinya: sebelum pernah menarik bayaran, gating server-side harus dibangun (P0-2). Pola yang direkomendasikan:

```ts
// lib/auth.ts  (usulan)
export function requirePro(user: AuthUser): NextResponse | null {
  return isPro(user) ? null : NextResponse.json({ error: 'Fitur PRO' }, { status: 403 });
}
// di route: const denied = requirePro(user); if (denied) return denied;
```

## 4. Isolasi data multi-user

Aturan emas: **setiap query Prisma pada data milik user harus menyertakan `userId` dari token — bukan dari body request.**

```ts
const user = getUserFromRequest(req);            // sumber kebenaran identitas
prisma.transaction.findMany({ where: { userId: user.userId, ... } });
```

Untuk update/delete, pola yang benar adalah **verifikasi kepemilikan dulu**:

```ts
const existing = await prisma.goal.findFirst({ where: { id, userId: user.userId } });
if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
await prisma.goal.delete({ where: { id } });
```

Handler yang **melanggar** pola ini saat ini (IDOR — bisa mengubah/menghapus data user lain bila ID diketahui): `accounts` PATCH & DELETE, `categories` PATCH & DELETE, `debts` PATCH. (P0-1.)

Constraint unik per user di database: `Category(userId,name)`, `Account(userId,name)`, `Budget(userId,month,categoryId)`, `Debt(userId,debtName)`, `Asset(userId,instrumentName)`, `Goal(userId,goalName)`.

## 5. Service layer (`lib/services.ts`)

Kumpulan fungsi murni-bisnis yang menerima `userId` sebagai argumen pertama:

| Fungsi | Guna |
|---|---|
| `createTransaction`, `getTransactions` | Buat (auto-buat kategori & rekening bila belum ada, update saldo) / daftar dengan filter + limit/offset |
| `createSavingsInvestment`, `getSavingsInvestments` | Catat & daftar tabungan/investasi |
| `getDebtSummaries` | Hitung sisa hutang/piutang, sisa limit, status |
| `getAssetSummaries` | Modal, untung/rugi, return % |
| `getBudgetSummaries` | Budget vs realisasi + status |
| `getGoalSummaries` | Progres & status goal |
| `getDailyReport / getWeeklyReport / getMonthlyReport` | Laporan |
| `getDashboardData` | Menyatukan semuanya → KPI, arus kas, tips otomatis |
| `getCategories`, `getAccounts`, `getUserProfile` | Helper (profil dibuat otomatis jika belum ada) |

Aturan hitung penting (jangan diubah tanpa paham dampaknya):

- **Saldo rekening** disimpan di kolom `Account.balance` dan di-`increment`/`decrement` setiap ada transaksi/transfer (denormalisasi). Tidak dibungkus DB transaction → bisa tidak sinkron bila satu langkah gagal.
- **Hutang Revolving** (kartu kredit/paylater): `totalSpent` = jumlah pengeluaran pada rekening ber-nama sama dengan hutang; `totalPaid` = transaksi kategori `Cicilan`/`Pembayaran Utang` yang **deskripsinya mengandung nama hutang**. Ini berbasis kecocokan teks — rapuh.
- **Hutang Fixed**: `remaining = limitOrPrincipal − totalPaid` (pembayaran dicari dengan cara teks yang sama).
- **Piutang**: `totalPaid` = pemasukan berkategori sama dengan nama piutang.
- **Aset**: `totalCapital = initialCapital + Σ Buy − Σ Sell`; `P&L = currentValue − totalCapital`.
- **Budget**: `<80%` Aman · `80–100%` Hampir Over · `>100%` Over Budget (`getBudgetStatus`).
- **Goal**: `progress ≥100%` Tercapai · lewat tanggal & <100% Gagal · selain itu On Track. Progres dihitung dari `SavingsInvestment` bertipe `Goals` dengan `instrumentName == goalName`.
- **Bulan & minggu** disimpan sebagai **string** di transaksi: `month = "Apr 2026"` (locale Indonesia: Jan, Feb, Mar, Apr, Mei, Jun, Jul, **Agu**, Sep, **Okt**, Nov, **Des**), `week = "Minggu 15 2026"` (ISO week).
- **ID bisnis:** `TRX-YYYYMMDD-NNN`, `INV-YYYYMMDD-NNN`, transfer `TRF-…`; nomor urut = jumlah data hari itu + 1 (bisa tabrakan bila dua request bersamaan; `txId` unik akan menolak salah satunya).

## 6. State di sisi client

| Mekanisme | File | Isi |
|---|---|---|
| `AuthProvider` / `useAuth()` | `app/auth-context.tsx` | login state, `role`, `plan` |
| `Providers` → `useTheme()`, `useToast()` | `app/providers.tsx` | tema gelap/terang, toast |
| `useSetupData()` | `app/hooks.ts` | cache modul-level untuk dropdown; panggil `refresh()`/`invalidateSetupCache()` setelah menambah kategori/rekening |
| State lokal per halaman | tiap `page.tsx` | `useState` + `fetch` di `useEffect` (tanpa SWR/React Query) |
| `localStorage` | `dashboard/layout.tsx` | `fp-sidebar-collapsed` |

## 7. Telegram bot

- `POST /api/webhook` → grammY `webhookCallback(bot, 'std/http')`. Bot dibuat sekali (cache modul).
- **Bot single-user:** `getAdminUserId()` mengambil ADMIN pertama; **semua** pesan dari chat mana pun diproses atas nama admin itu. Tidak ada whitelist chat ID dan tidak ada `secret_token` webhook → siapa pun yang menemukan bot bisa membaca/menambah data admin. **Jangan aktifkan webhook di produksi sebelum diperbaiki (lihat T-BOT-1).**
- Percakapan multi-langkah disimpan di `Map` di memori → hilang saat serverless cold-start.
- Command: `/start /help /add /transaksi /nabung /investasi /hutang /bayar /aset /budget /goals /harian /mingguan /bulanan /dashboard /templatetransaksi /templateinvestasi`. Input satu baris dipisah `|` (parser di `lib/utils.ts`: `parseTransactionInput`, `parseSavingsInput`).

## 8. Styling

- Tailwind + kelas komponen di `app/globals.css`. `<html class="dark">` di-hardcode di `layout.tsx`; toggle tema ada (`useTheme`) tetapi tampilan dirancang dark-first (`bg-slate-800`, `text-slate-400`, …).
- Pakai kelas yang sudah ada: `card`, `kpi-card`, `btn-primary`, `btn-secondary`, `input-field`, `form-label`, `badge-*`.
- ⚠ **Jangan buat nama kelas Tailwind dinamis** (`` `bg-${color}-500` ``). Tailwind hanya menyertakan kelas yang tertulis utuh di source. Bug ini sudah ada di `app/page.tsx:88-89` (warna ikon fitur tidak akan muncul di production build).

## 9. Deployment (rencana)

Vercel (Next.js) + Supabase (Postgres). DNS: CNAME `financepro` → `cname.vercel-dns.com` (di cPanel `grexion.ai`). Build command: `prisma generate && next build` (sudah di `package.json`). Cron (untuk kedaluwarsa plan, dll.) → Vercel Cron memanggil route `/api/cron/*` yang dilindungi `CRON_SECRET`. Bot butuh `setWebhook` ke `https://<domain>/api/webhook`.
