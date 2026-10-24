# 04 — Database

Sumber kebenaran: `prisma/schema.prisma`. PostgreSQL. ID semua tabel = `cuid()` (string). Setiap model data turunan `User` memakai `onDelete: Cascade` — **menghapus user menghapus seluruh datanya**.

## Diagram relasi (ringkas)

```
User ─┬─ 1:1 ── UserProfile
      ├─ 1:N ── Category ──┬── N:1 ── Transaction
      │                    └── N:1 ── Budget
      ├─ 1:N ── Account ───┬── N:1 ── Transaction
      │                    ├── N:1 ── SavingsInvestment
      │                    └── N:1 ── Transfer (from / to)
      ├─ 1:N ── Debt          (tidak terhubung lewat FK ke tabel lain)
      ├─ 1:N ── Asset         (tidak terhubung lewat FK)
      ├─ 1:N ── Goal          (tidak terhubung lewat FK)
      ├─ 1:N ── Budget
      ├─ 1:N ── SavingsInvestment
      └─ 1:N ── Transfer
```

## Model

### User
| Field | Tipe | Catatan |
|---|---|---|
| `username` | String, unik | Dipakai login. Regex saat daftar: `^[a-zA-Z0-9_]+$` |
| `email` | String?, unik | Opsional. **Belum dipakai untuk apa pun** (tidak ada verifikasi/email). Dibutuhkan untuk reset password (Bulan 2) |
| `password` | String | Hash bcrypt |
| `role` | `ADMIN` \| `USER` | default `USER` |
| `plan` | `FREE` \| `PRO` | default `FREE` |
| `planExpiresAt` | DateTime? | Diisi admin. **Tidak ditegakkan** |
| `displayName`, `createdAt`, `lastLogin` | | |

### UserProfile (1:1)
`name` (default "User"), `currency` (default "IDR" — hanya ditampilkan di settings, tidak dipakai format angka), `startDate`, `targetSavings?`, `targetExpense?`. Dibuat otomatis oleh `getUserProfile()` bila belum ada.

### Category
`name`, `type` (`"expense"` | `"income"` — string biasa, bukan enum), `icon?` (**tidak dipakai**). Unik `(userId, name)`. Dibuat otomatis saat mencatat transaksi dengan kategori baru.

### Account (rekening)
| Field | Catatan |
|---|---|
| `name`, `type` | tipe di UI: `bank`, `cash`, `ewallet`, `credit_card`, `paylater` (string biasa) |
| `balance` (Float) | **Saldo tersimpan** — di-update inkremental oleh transaksi/transfer. Bukan hasil hitung ulang |
| `isDebt` | `true` untuk rekening yang dibuat otomatis saat membuat hutang Revolving (`debts/route.ts`) |
| `debtId` | **Tidak dipakai** |
| `adjustments` (Json, default `[]`) | Riwayat koreksi saldo manual: `{date, oldBalance, newBalance, amount, notes}` |

Unik `(userId, name)`. Dibuat otomatis bila transaksi menyebut nama rekening yang belum ada.

### Transaction
`txId` (unik global, format `TRX-YYYYMMDD-NNN`), `date`, `categoryId`, `accountId`, `type` (`Pemasukan` | `Pengeluaran`), `amount` (Float), `description`, `note?`, **`month`** (string `"Apr 2026"`), **`week`** (string `"Minggu 15 2026"`). Indeks: `userId, date, month, week, type, categoryId`.

### SavingsInvestment
`invId` (unik), `date`, `assetType` (string bebas), `instrumentName`, `transactionType` (`Buy` | `Sell` | `Withdraw` | `Goals`), `nominal`, `pricePerUnit?`, `units?` (= nominal ÷ harga), `accountId`, `notes?`. **Tidak mengubah `Account.balance`** (berbeda dengan Transaction).

### Debt
`debtType` (`Revolving` | `Fixed`), `debtName`, `limitOrPrincipal`, `interestRate`, `tenor?`, `monthlyPayment?`, `startDate?`, `status` (`Active` | `Lunas` | `OverLimit` — **kolom ini tidak dipakai**; status dihitung ulang di `getDebtSummaries`), `isPiutang` (true = uang orang lain yang dipinjam dari kita). Unik `(userId, debtName)`.

### Asset
`assetType`, `instrumentName`, `initialCapital`, `startDate?`, `currentValue` (diinput manual user), `lastUpdated`. Unik `(userId, instrumentName)`. Terhubung ke `SavingsInvestment` **lewat kecocokan nama**, bukan FK.

### Budget
`month` (string `"Apr 2026"`), `categoryId`, `amount`. Unik `(userId, month, categoryId)`.

### Goal
`goalName`, `targetAmount`, `targetDate`, `status` (`OnTrack` | `Tercapai` | `Gagal` — **kolom tidak dipakai**, dihitung ulang). Unik `(userId, goalName)`. Terhubung ke `SavingsInvestment` (tipe `Goals`) **lewat kecocokan nama**.

### Transfer
`txId` (unik, `TRF-…`), `date`, `fromAccountId`, `toAccountId`, `amount`, `notes?`. Mengubah saldo kedua rekening.

### Enum
`UserRole{ADMIN,USER}` · `UserPlan{FREE,PRO}` · `TransactionType{Pemasukan,Pengeluaran}` · `SavingsType{Buy,Sell,Withdraw,Goals}` · `DebtType{Revolving,Fixed}` · `DebtStatus{Active,Lunas,OverLimit}` · `GoalStatus{OnTrack,Tercapai,Gagal}`

## Keanehan yang harus kamu ingat

1. **Uang = `Float`.** Rawan pembulatan. Untuk Rupiah (tanpa sen) masih bisa jalan, tetapi rencana jangka panjang: `Decimal`/integer. Ini keputusan besar — **jangan ubah sendiri**, diskusikan dengan mentor (lihat T-DEBT-6).
2. **Relasi lewat nama, bukan FK:** Debt↔transaksi pembayaran (deskripsi mengandung nama), Asset↔SavingsInvestment (`instrumentName`), Goal↔SavingsInvestment (`goalName`), Budget↔Transaction (via `categoryId`, ini FK benar). Mengganti nama hutang/aset/goal **memutus** hubungannya.
3. **`month`/`week` berupa string berlokal Indonesia** → tidak bisa diurutkan/di-range dengan benar oleh database; pengurutan dilakukan lewat `date`. Jangan membuat string ini manual; selalu `getMonthString(date)` / `getWeekString(date)`.
4. **Saldo rekening bukan hasil turunan** → dapat menyimpang bila ada kegagalan di tengah (tidak ada `prisma.$transaction`, 0 pemakaian di repo). `GET /api/accounts` menghitung total masuk/keluar dari agregat, sementara `balance` dari kolom — keduanya bisa berbeda.
5. **Efek samping pembuatan hutang:** `POST /api/debts` untuk hutang Revolving (bukan piutang) otomatis membuat/mengubah **Account** bernama sama (`isDebt=true`, tipe `credit_card`); untuk **piutang** otomatis membuat/mengubah **Category** bernama sama (`income`). Menghapus hutang **tidak** menghapus Account/Category itu.
6. **Kolom yatim:** `Account.debtId`, `Category.icon`, `Debt.status`, `Goal.status`, `User.email` (belum dipakai). Aman dibiarkan; hapus hanya lewat task terencana.
7. **`Transaction.txId` unik global** (bukan per user) dan dibangun dari hitungan per-user-per-hari → dua user yang mencatat pada hari yang sama bisa menghasilkan `TRX-20260415-001` yang sama → **tabrakan unik lintas user**. Bug laten; dicatat di T-DEBT-4.

## Perintah database

```bash
npx prisma db push        # samakan DB dengan schema (tanpa file migrasi) — dipakai proyek ini
npx prisma studio         # GUI lihat/ubah data (npm run db:studio)
npm run db:seed           # admin + kategori + data demo (jalankan di DB LOKAL saja)
npx prisma generate       # regenerasi client (otomatis via postinstall)
```

Proyek belum memakai `prisma migrate` (tidak ada folder `migrations/`). Untuk perubahan schema: ubah `schema.prisma` → `db push` di DB lokal → uji → mentor review → jalankan `db push` di produksi **oleh mentor**, bukan intern.
