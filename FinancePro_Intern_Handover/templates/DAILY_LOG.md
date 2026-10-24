# Catatan Harian Magang — FinancePro

Isi singkat setiap hari kerja (5 menit). Bahan utama laporan magang dan bukti kontribusi untuk kampus. Simpan sebagai `DAILY_LOG.md` (atau satu file per minggu). **Jangan menulis secret atau data user nyata di sini.**

---

## Format satu hari

### YYYY-MM-DD (Hari, Minggu ke-N)
- **Task:** <ID> — <judul>
- **Jam kerja:** ___
- **Yang dikerjakan:**
  -
- **Hasil / bukti:** (commit, PR, screenshot)
- **Kendala:**
  -
- **Cara mengatasi / bantuan yang dibutuhkan:**
  -
- **Dipelajari hari ini:**
  -
- **Rencana besok:**
  -

---

## Contoh terisi

### 2026-10-05 (Senin, Minggu ke-8)
- **Task:** P0-1 — Tutup celah IDOR
- **Jam kerja:** 4
- **Yang dikerjakan:**
  - Membaca `goals/route.ts` (pola cek kepemilikan yang benar)
  - Memperbaiki `categories` PATCH & DELETE dengan `findFirst({ id, userId })`
- **Hasil / bukti:** commit `fix: cek kepemilikan pada categories PATCH/DELETE`; skrip curl 2-user di `notes/P0-1.md`
- **Kendala:** AI awalnya memakai `updateMany` tanpa memeriksa `count` → 200 padahal tidak ada yang berubah
- **Cara mengatasi:** minta AI menambah cek `count === 0 → 404`; diuji ulang dengan user B
- **Dipelajari hari ini:** IDOR = akses data lewat ID tanpa cek pemilik; `cuid` sulit ditebak tetapi bukan kontrol keamanan
- **Rencana besok:** `accounts` PATCH/DELETE + uji

---

## Ringkasan mingguan (Jumat)

| Minggu | Task selesai | Task berjalan | Kendala utama | Yang butuh keputusan mentor |
|---|---|---|---|---|
| 1 | | | | |
