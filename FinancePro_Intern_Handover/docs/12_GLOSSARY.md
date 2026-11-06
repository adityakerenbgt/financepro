# 12 — Glosarium Istilah

Istilah domain keuangan & istilah yang dipakai di kode/UI. Nilai `enum` ditulis persis seperti di database.

## Transaksi & rekening

| Istilah | Arti | Di kode |
|---|---|---|
| **Pemasukan** | Uang masuk (gaji, bonus, dll.) | `TransactionType.Pemasukan`, kategori `type: "income"` |
| **Pengeluaran** | Uang keluar | `TransactionType.Pengeluaran`, kategori `type: "expense"` |
| **Kategori** | Pengelompokan transaksi (Makan & Minum, Gaji, …) | model `Category` (unik per user) |
| **Rekening** | Tempat menyimpan uang: `bank`, `cash` (tunai), `ewallet`, `credit_card`, `paylater` | model `Account`; saldo di `balance` |
| **Koreksi saldo** | Penyesuaian manual saldo rekening + catatan | `Account.adjustments` (JSON) |
| **Transfer** | Pindah uang antar rekening (bukan pemasukan/pengeluaran) | model `Transfer`, ID `TRF-…` |
| **txId** | ID bisnis transaksi `TRX-YYYYMMDD-NNN` | `Transaction.txId` |
| **Bulan** | String `"Apr 2026"` (Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des) | `Transaction.month`, `Budget.month` |
| **Minggu** | String `"Minggu 15 2026"` (minggu ISO) | `Transaction.week` |

## Nabung & investasi

| Istilah | Arti |
|---|---|
| **Nabung & Investasi** | Catatan setoran/pembelian/penjualan instrumen (reksadana, saham, emas, tabungan) — model `SavingsInvestment` |
| **Buy** | Beli/setor instrumen (menambah modal) |
| **Sell** | Jual instrumen (mengurangi modal) |
| **Withdraw** | Tarik dana dari tabungan/instrumen |
| **Goals** (tipe transaksi) | Setoran yang dialokasikan ke sebuah Goal; `instrumentName` = nama goal |
| **Instrumen** | Nama produk investasi, mis. "Makmur RDPT" (`instrumentName`) |
| **Harga per unit / Unit** | `pricePerUnit`; `units = nominal ÷ pricePerUnit` |
| **Aset** | Posisi kepemilikan saat ini dengan nilai yang diinput manual — model `Asset` |
| **Modal awal / Total modal** | `initialCapital` / `initialCapital + ΣBuy − ΣSell` |
| **Nilai saat ini** | `currentValue`, diperbarui manual oleh user |
| **P&L (untung/rugi)** | `currentValue − totalCapital` |
| **Return %** | `P&L ÷ totalCapital × 100` |
| **Net Worth (kekayaan bersih)** | Total aset dikurangi kewajiban — *belum ada di aplikasi* (T-5.2) |

## Hutang & piutang

| Istilah | Arti |
|---|---|
| **Hutang** | Kewajiban user membayar pihak lain |
| **Piutang** | Uang user yang dipinjam orang lain (`isPiutang = true`); pelunasan tercatat sebagai pemasukan berkategori nama piutang |
| **Revolving** | Kredit bergulir: kartu kredit, paylater (`DebtType.Revolving`). Ada **limit**; pemakaian menaikkan tagihan |
| **Fixed** | Cicilan tetap: KPR, KKB, KUR (`DebtType.Fixed`). Ada **pokok** & **tenor** |
| **Limit / Pokok** | `limitOrPrincipal` |
| **Tenor** | Lama cicilan (bulan) |
| **Bunga** | `interestRate` (persen) — hanya disimpan, belum dipakai menghitung |
| **Cicilan / Pembayaran Utang** | Nama kategori khusus yang dikenali sebagai pembayaran hutang |
| **Sisa limit** | `limit − (totalSpent − totalPaid)` untuk Revolving |
| **Lunas** | Hutang terbayar penuh (sisa ≤ 0) |
| **Over Limit** | Pemakaian Revolving melebihi limit |

## Budget & goals

| Istilah | Arti |
|---|---|
| **Budget** | Anggaran per kategori per bulan |
| **Realisasi** | Total pengeluaran nyata di kategori & bulan itu |
| **Aman / Hampir Over / Over Budget** | Realisasi < 80% / 80–100% / > 100% dari anggaran |
| **Goal** | Target tabungan dengan nominal & tenggat |
| **On Track / Tercapai / Gagal** | Progres berjalan / ≥ 100% / lewat tenggat & < 100% |
| **Progres goal** | `Σ setoran bertipe Goals dengan nama sama ÷ targetAmount` |

## Akun, paket, bisnis

| Istilah | Arti |
|---|---|
| **USER / ADMIN** | Peran akun. ADMIN = pemilik, akses Admin Panel & dianggap PRO |
| **FREE / PRO** | Paket. FREE gratis & terbatas; PRO berbayar (Rp29.000/bln atau Rp249.000/thn) |
| **ProGate** | Komponen layar kunci "Fitur PRO" |
| **Trial** | Percobaan PRO gratis saat mendaftar (`TRIAL_DAYS` = 3 hari di `lib/plans.ts`); dikenali dari `planExpiresAt == trialEndsAt` (T-3.1) |
| **planExpiresAt** | Tanggal kedaluwarsa PRO (diisi admin; belum ditegakkan) |
| **Plan efektif** | Plan yang berlaku setelah memperhitungkan kedaluwarsa (P0-4) |
| **Downgrade** | Turun dari PRO ke FREE saat kedaluwarsa (T-4.1) |
| **MRR** | Monthly Recurring Revenue — pendapatan berulang bulanan (T-4.3) |
| **Konversi** | Persentase user yang menjadi pelanggan berbayar |
| **Payment request** | Permintaan verifikasi pembayaran manual dengan bukti transfer (T-3.2) |
| **Digest** | Email ringkasan berkala (mingguan) (T-4.4) |
| **Cron** | Pekerjaan terjadwal otomatis (Vercel Cron) |

## Istilah teknis

| Istilah | Arti |
|---|---|
| **IDOR** | Insecure Direct Object Reference — mengakses data orang lain dengan menebak/mengetahui ID |
| **JWT** | JSON Web Token, disimpan di cookie `auth-token` |
| **Edge Runtime** | Lingkungan eksekusi ringan tempat `middleware.ts` berjalan (tanpa API Node penuh) |
| **App Router** | Sistem routing Next.js 14 berbasis folder `app/` |
| **Route handler** | File `route.ts` yang mendefinisikan endpoint API |
| **Server / Client component** | Komponen render di server / di browser (`'use client'`) |
| **Seed** | Skrip mengisi data awal (`prisma/seed.ts`) |
| **`db push`** | Sinkronkan schema Prisma ke database tanpa file migrasi |
| **Webhook** | Endpoint yang dipanggil layanan luar (Telegram) saat ada kejadian |
| **Vibe coding** | Membangun software dengan menginstruksikan AI menulis kode, sambil manusia mengarahkan & meninjau |
