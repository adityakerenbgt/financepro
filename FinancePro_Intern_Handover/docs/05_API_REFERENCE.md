# 05 — Referensi API

20 file route di `app/api/**/route.ts`. Semua memakai cookie `auth-token` (dikirim otomatis browser). Semua body & response JSON.

## Konvensi respons

- **Sukses:** objek/array mentah (tanpa amplop `{success, data}`), kecuali beberapa yang mengembalikan `{ success: true }`.
- **Error:** `{ "error": "pesan" }` dengan status `400` (validasi) · `401` (belum login) · `403` (bukan ADMIN) · `404` · `409` (duplikat) · `500`.
- ⚠ Blok `catch` mengembalikan `error.message` mentah pada status 500 → pesan Prisma/DB bisa bocor ke client. Perbaikan: log di server, kembalikan pesan generik (lihat T-DEBT-3).
- ⚠ Tidak ada validasi skema (Zod). Validasi dilakukan manual & minimal; `parseFloat` tanpa cek `NaN`.

Legenda kolom **PRO?**: ❌ = fitur PRO menurut produk **tetapi server tidak memeriksa plan** (P0-2). — = memang untuk semua user.

## Auth (`/api/auth/*`)

| Method & path | Auth | Body / Query | Respons | Catatan |
|---|---|---|---|---|
| `POST /api/auth/login` | publik | `{username, password}` | `{success, username, role, plan}` + set cookie | 401 pesan generik "Username atau password salah". Tanpa rate limit |
| `POST /api/auth/logout` | publik | — | `{success}` | Menghapus cookie |
| `POST /api/auth/register` | publik | `{username, email?, displayName?, password, confirmPassword}` | `201 {success, user}` | Password ≥ 8, username `^[a-zA-Z0-9_]+$`, cek duplikat username/email. Plan `FREE`. **Belum ada trial 14 hari, rate limit, verifikasi email** |
| `GET /api/auth/verify` | cookie | — | `{authenticated, username, role, plan}` | Membaca **dari token**, bukan DB (plan bisa basi) |
| `POST /api/auth/seed` | **publik!** | — | `201` / `200 "already exists"` | ⚠ Membuat akun admin dengan password tertanam di source, dan **tanpa `role: 'ADMIN'`** (jadi USER/FREE). Harus dikunci/dihapus (P0-3) |

## Data inti (semua user)

| Method & path | Body / Query | Catatan |
|---|---|---|
| `GET /api/setup` | — | `{profile, categories, accounts, goals[], debts[], assets[]}` untuk dropdown |
| `POST /api/setup` | `{type: 'profile'\|'category'\|'account', name, ...}` | Upsert profil/kategori/rekening. Profil: `{name, currency, targetSavings, targetExpense}`; kategori: `{name, catType}`; rekening: `{name, accType}` |
| `PUT /api/setup` | `{name, currency, targetSavings, targetExpense}` | Upsert profil |
| `GET /api/transactions` | `?startDate&endDate&type&category&search&limit&offset` | `{transactions, total}`. Default `limit=25`. `search` = `contains`, case-insensitive pada deskripsi |
| `POST /api/transactions` | `{date, category, description, account, type, amount, note?}` | `date` boleh `DD/MM/YYYY` atau `YYYY-MM-DD`. Kategori/rekening dibuat otomatis jika belum ada. Mengubah `Account.balance` |
| `PATCH /api/transactions` | `{id, date, category, description, account, type, amount, note?}` | Cek kepemilikan ✅. Membalik saldo lama lalu menerapkan yang baru (tidak atomik) |
| `DELETE /api/transactions` | `{id}` | Cek kepemilikan ✅. Membalik saldo |
| `GET /api/accounts` | — | Rekening + total masuk/keluar/transfer + `lastActivity` |
| `POST /api/accounts` | `{name, type?, initialBalance?}` | 400 bila nama duplikat. **Tanpa batas 1 rekening untuk FREE** |
| `PATCH /api/accounts` | `{id, balance?, name?, type?, notes?}` | ⚠ **IDOR**: tidak memeriksa kepemilikan sebelum `update`. Perubahan saldo + `notes` dicatat ke `adjustments` |
| `DELETE /api/accounts` | `{id}` | Ditolak bila punya transaksi. ⚠ **IDOR** (hitung transaksi difilter `userId`, hapusnya tidak) |
| `GET /api/categories` | — | Daftar kategori user |
| `POST /api/categories` | `{name, type}` | |
| `PATCH /api/categories` | `{id, name, type}` | ⚠ **IDOR** |
| `DELETE /api/categories` | `{id}` | Ditolak bila dipakai transaksi. ⚠ **IDOR** |
| `GET /api/transfer` | — | Daftar transfer |
| `POST /api/transfer` | `{date, fromAccount, toAccount, amount, notes?}` | **Nama** rekening (bukan ID). Update dua saldo via `Promise.all` (tidak atomik) |
| `DELETE /api/transfer` | `{id}` | Cek kepemilikan ✅; membalik saldo |
| `GET /api/dashboard-data` | `?startDate&endDate` | `DashboardData` (KPI, arus kas, top-5 kategori, budget, investasi, goals, tips). Batas "bulan berjalan" untuk FREE **tidak ditegakkan** |

## Fitur PRO

| Method & path | PRO? | Body / Query | Catatan |
|---|---|---|---|
| `GET /api/savings` | ❌ | `?startDate&endDate&type&instrument` | |
| `POST /api/savings` | ❌ | `{date, assetType, instrumentName, transactionType, nominal, pricePerUnit?, account, notes?}` | `transactionType`: `Buy\|Sell\|Withdraw\|Goals`. **Tidak mengubah saldo rekening** |
| `PATCH /api/savings` · `DELETE /api/savings` | ❌ | `{id, ...}` / `{id}` | Cek kepemilikan ✅ |
| `GET /api/debts` | ❌ | — | Ringkasan dari `getDebtSummaries` |
| `POST /api/debts` | ❌ | `{debtType, debtName, limitOrPrincipal, interestRate?, tenor?, monthlyPayment?, startDate?, isPiutang?}` | Efek samping: Revolving (bukan piutang) → **upsert Account** bernama sama (`isDebt`); piutang → **upsert Category** bernama sama (`income`) |
| `PATCH /api/debts` | ❌ | `{id, ...}` | ⚠ **IDOR** (tidak cek kepemilikan) |
| `DELETE /api/debts` | ❌ | `{id}` | Cek kepemilikan ✅ |
| `POST /api/debt-payments` | ❌ | `{debtId, isPiutang, debtName, amount, date, notes?, accountId}` | Membuat `Transaction` (kategori `Cicilan`/`Pembayaran Utang` untuk hutang; pemasukan untuk piutang). Verifikasi debt & account milik user ✅ |
| `GET /api/debt-payments` | ❌ | `?debtId` | Riwayat pembayaran |
| `GET /api/assets` | ❌ | — | Ringkasan dari `getAssetSummaries` |
| `POST /api/assets` | ❌ | `{assetType, instrumentName, initialCapital, currentValue, startDate?}` | |
| `PATCH /api/assets` | ❌ | `{id, currentValue}` **atau** `{id, assetType, instrumentName, initialCapital, currentValue, startDate?}` | Bila ada `assetType` → update penuh; jika tidak → hanya nilai saat ini. Cek kepemilikan ✅ |
| `DELETE /api/assets` | ❌ | `{id}` | ✅ |
| `GET /api/budget` | ❌ | `?month=Apr 2026` | Ringkasan + status |
| `POST /api/budget` | ❌ | `{month, category, amount}` | Kategori dibuat bila belum ada |
| `PATCH /api/budget` · `DELETE /api/budget` | ❌ | `{id, amount}` / `{id}` | ✅ |
| `GET /api/goals` | ❌ | — | Ringkasan + progres |
| `POST /api/goals` | ❌ | `{goalName, targetAmount, targetDate}` | |
| `PATCH /api/goals` · `DELETE /api/goals` | ❌ | `{id, goalName, targetAmount, targetDate}` / `{id}` | ✅ |
| `GET /api/reports` | ❌ | `?type=daily&date=…` · `?type=weekly&thisWeek=Minggu 15 2026&lastWeek=Minggu 14 2026` · `?type=monthly&month=Apr 2026` | Format string bulan/minggu harus persis sama seperti yang disimpan |

## Admin & bot

| Method & path | Auth | Body | Catatan |
|---|---|---|---|
| `GET /api/admin/users` | ADMIN | — | Semua user (tanpa password) |
| `POST /api/admin/users` | ADMIN | `{username, displayName?, password, role?}` | Password disimpan sebagai hash. Tidak ada minimum panjang password di endpoint ini |
| `PATCH /api/admin/users` | ADMIN | `{id, displayName?, password?, role?, plan?, planExpiresAt?}` | Dipakai tombol "Jadikan PRO" (set `plan=PRO`, `planExpiresAt` = hari ini + 1 bulan) & "Turunkan ke FREE" (`plan=FREE`, `planExpiresAt=null`) di panel admin |
| `DELETE /api/admin/users` | ADMIN | `{id}` | Tidak bisa menghapus diri sendiri. **Cascade menghapus semua data user itu** |
| `POST /api/webhook` | **publik, tanpa verifikasi** | Update Telegram | ⚠ Tidak memeriksa `X-Telegram-Bot-Api-Secret-Token`; bot bekerja atas nama admin pertama |
| `GET /api/webhook` | publik | — | `{status: 'FinancePro bot webhook is active'}` |

## Cara cepat mencoba API (dev)

1. Login lewat UI (`/login`), lalu di DevTools → Network salin request; atau
2. dengan curl (simpan cookie):

```bash
curl -c cj.txt -H "Content-Type: application/json" \
  -d '{"username":"<user>","password":"<pass>"}' http://localhost:3000/api/auth/login
curl -b cj.txt "http://localhost:3000/api/transactions?limit=5"
```

## Pola menambah endpoint baru

Lihat `10_CONVENTIONS.md` § "Template API route" (sudah lengkap dengan cek auth, cek kepemilikan, dan cek PRO).
