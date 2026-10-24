# 08 — Panduan Vibe Coding untuk Proyek Ini

Vibe coding = kamu menjelaskan apa yang diinginkan, AI (Claude Code / Cursor / dll.) menulis kodenya. Ini cepat — dan berbahaya jika kamu berhenti berpikir. Prinsip proyek ini:

> **AI yang mengetik. Kamu yang bertanggung jawab.** Kode yang kamu merge adalah kodemu — termasuk bug keamanannya.

## 1. Persiapan (sekali saja)

1. Salin `ai-context/CLAUDE.md` ke **root repo** (nama tetap `CLAUDE.md`; untuk Codex/agen lain pakai `AGENTS.md`). Alat AI membacanya otomatis di awal sesi sehingga ia tahu aturan proyek ini.
2. Jalankan proyek secara lokal (`09_LOCAL_SETUP.md`) **sebelum** meminta AI mengubah apa pun. Kamu perlu tahu keadaan "hijau" (sebelum diubah).
3. Selalu bekerja di **branch** sendiri: `git switch -c feat/T-1.3-landing-page`.
4. Buka 3 hal berdampingan: editor, terminal `npm run dev`, dan browser. Setelah tiap perubahan **lihat hasilnya di browser**.

## 2. Alur kerja satu task (ulangi terus)

```
1. Baca task di 07_TASK_BACKLOG.md (tujuan, file, acceptance criteria)
2. Minta AI MEMBACA dulu & MENJELASKAN kode terkait  (jangan langsung menulis)
3. Minta AI membuat RENCANA singkat → kamu setujui/koreksi
4. Implementasi KECIL-KECIL (satu bagian per prompt)
5. Setelah tiap bagian:  npx tsc --noEmit  +  uji di browser
6. Baca `git diff` — SEMUA baris. Tanya AI untuk hal yang tidak kamu pahami
7. Uji acceptance criteria satu per satu (centang di catatan task)
8. Commit → push → PR → PR_CHECKLIST → minta review mentor
```

Langkah 2 & 3 adalah yang paling sering dilewati dan paling menghemat waktu. Gunakan **plan mode** (di Claude Code: `Shift+Tab` sampai "plan") untuk apa pun yang menyentuh schema, auth, atau uang.

## 3. Aturan besi khusus repo ini (AI sering melanggarnya)

| # | Aturan | Kalau dilanggar |
|---|---|---|
| 1 | **Setiap query data user memakai `userId` dari token** (`getUserFromRequest`), bukan dari body/query | Data user lain bocor |
| 2 | **Update/delete: cek kepemilikan dulu** (`findFirst({ id, userId })`) | IDOR (bug yang sudah ada di 5 tempat) |
| 3 | **Fitur PRO dijaga di dua lapis:** `ProGate` di halaman **dan** cek plan di API | User FREE bypass lewat API |
| 4 | **Middleware = `jose`; API route = `jsonwebtoken`.** Jangan impor `jsonwebtoken` ke `middleware.ts` | Build/Edge error |
| 5 | **Jangan menaruh secret di kode/git/prompt.** Pakai env var | Kebocoran; wajib rotate |
| 6 | **Ubah schema hanya di DB lokal kamu**, `db push` produksi hanya oleh mentor | Data user produksi rusak |
| 7 | **Tidak ada kelas Tailwind dinamis** (`` `bg-${x}-500` ``) — tulis utuh atau pakai peta statis | Gaya hilang di production |
| 8 | **Hitung angka bisnis di `lib/services.ts`**, bukan di komponen | Angka berbeda antar halaman & bot |
| 9 | **Format uang & tanggal lewat `lib/utils.ts`** (`formatCurrency`, `parseDate`, `getMonthString`) | Format tidak konsisten, bug bulan |
| 10 | **Teks UI Bahasa Indonesia; kode Bahasa Inggris** | Inkonsisten |
| 11 | **Jangan tambah dependency baru tanpa izin mentor** (`npm audit` dulu) | Risiko keamanan & ukuran bundle |
| 12 | **Jangan matikan pemeriksaan** (`// @ts-ignore`, `as any`, `--no-verify`) untuk "membuat error hilang" | Menyembunyikan bug |

## 4. Template prompt (salin, isi bagian `< >`)

### 4.1 Memulai sesi
```
Baca CLAUDE.md dan docs/03_ARCHITECTURE.md. Saya akan mengerjakan task <ID> (<judul>)
dari docs/07_TASK_BACKLOG.md. Jangan ubah file apa pun dulu.
Jelaskan: (1) file mana yang relevan, (2) pola yang sudah dipakai di kode serupa,
(3) risiko/keanehan yang perlu saya waspadai. Lalu usulkan rencana langkah demi langkah.
```

### 4.2 Fitur baru (setelah rencana disetujui)
```
Implementasikan langkah 1 dari rencana: <deskripsi>.
Ikuti pola di <file contoh, mis. app/api/goals/route.ts>.
Batasan: hanya ubah <file>; filter semua query dengan userId dari getUserFromRequest;
teks UI Bahasa Indonesia; tanpa dependency baru; tanpa `any` baru; tanpa console.log.
Setelah selesai jalankan `npx tsc --noEmit` dan tunjukkan ringkasan perubahan per file.
```

### 4.3 Endpoint API baru
```
Buat endpoint <METHOD /api/...> mengikuti "Template API route" di docs/10_CONVENTIONS.md.
Wajib: cek login (401), <cek PRO (403)>, validasi input (400) dengan pesan Indonesia,
cek kepemilikan sebelum update/delete (404), jangan bocorkan error.message ke client.
Tulis juga skrip curl untuk mengujinya dengan 2 user berbeda.
```

### 4.4 Perubahan schema database
```
Saya perlu model/kolom baru: <deskripsi>. Jangan jalankan `prisma db push`.
Tampilkan dulu diff schema.prisma yang diusulkan beserta: indeks yang dibutuhkan,
onDelete, unique constraint, dan dampaknya ke data yang sudah ada. Tunggu persetujuan saya.
```

### 4.5 Perbaikan bug
```
Bug: <perilaku yang salah>. Yang diharapkan: <perilaku benar>.
Langkah reproduksi: <1,2,3>. Pesan error/log: <tempel — tanpa secret>.
Cari PENYEBAB AKAR dulu (baca kode, jangan menebak). Jelaskan penyebabnya sebelum
mengubah. Perbaikan seminimal mungkin; tambahkan uji yang gagal sebelum & lulus sesudah perbaikan.
```

### 4.6 Perbaikan celah keamanan
```
Periksa <file/handler> terhadap: kepemilikan data (IDOR), pengecekan plan, validasi input,
kebocoran error.message, secret tertanam. Untuk tiap temuan beri: baris, skenario serangan
konkret (input → akibat), dan perbaikan. Jangan mengubah apa pun sebelum saya setujui daftar temuannya.
```

### 4.7 Review diff sebelum commit
```
Review `git diff` saya seperti reviewer keamanan yang ketat. Cari: query tanpa userId,
route tanpa cek auth/plan, secret/kredensial, console.log, `any` baru, kelas Tailwind dinamis,
perubahan di luar lingkup task, dan kasus tepi yang belum diuji. Urutkan dari paling serius.
```

### 4.8 Memahami kode
```
Jelaskan <file/fungsi> seperti ke junior developer: tujuan, alur data langkah demi langkah,
input/outputnya, dan 3 hal yang mudah salah dipahami. Beri contoh data konkret.
```

## 5. Kebiasaan buruk AI yang sudah dapat diprediksi di repo ini

- **Lupa `userId`** pada query baru — selalu periksa.
- **Menganggap `isPro` sudah dipakai** — tidak; harus dipanggil manual.
- **Mengimpor `jsonwebtoken` di middleware** atau membuat secret fallback baru.
- **Membuat kelas Tailwind dinamis** dan menambah warna/teks acak di luar palet.
- **`db push` sendiri** untuk "mengetes" — tolak; ubah DB lokal saja.
- **Menambah library** untuk hal sepele (date picker, state manager) — tolak, pakai yang ada.
- **Menulis komentar panjang & abstraksi berlebihan** — minta versi paling sederhana.
- **Mengubah banyak file sekaligus** — kembalikan ke satu bagian per prompt.
- **Mengarang API/nama fungsi** yang tidak ada — minta ia `grep` dulu dan tunjukkan file/barisnya.
- **"Memperbaiki" test agar lulus** alih-alih memperbaiki kode — tolak.
- **Format angka/tanggal buatan sendiri** — arahkan ke `lib/utils.ts`.

## 6. Cara men-debug bersama AI

1. Salin **pesan error lengkap** dari terminal/console browser (tanpa secret). Jangan parafrase.
2. Beri tahu **apa yang berubah** sejak terakhir berjalan baik (`git diff`, `git stash` untuk membandingkan).
3. Minta AI **menyebutkan hipotesis + cara membuktikannya** (log, breakpoint, query di `prisma studio`) sebelum mengubah kode.
4. Kesalahan umum di proyek ini:
   - `P2002` = pelanggaran unique (nama duplikat / `txId` bentrok).
   - `401` di API = cookie kedaluwarsa/hilang → login ulang.
   - `Environment variable not found: DATABASE_URL` saat `prisma …` → Prisma CLI membaca `.env`, bukan `.env.local` (lihat `09_LOCAL_SETUP.md`).
   - Halaman kosong setelah login → cek tab Network: biasanya API 500 karena DB tak terjangkau.
   - Data "hilang" di dropdown → cache `useSetupData`; panggil `refresh()`.
5. Buntu > 45 menit? **Tanya mentor** dengan format: *apa yang ingin dicapai · apa yang sudah dicoba · pesan error · file/baris*.

## 7. Git & PR

```bash
git switch -c feat/T-2.3-email-welcome      # 1 task = 1 branch
git add <file spesifik>                     # JANGAN `git add .` (bisa membawa .env)
git status                                  # pastikan tidak ada .env / file aneh
git commit -m "feat: kirim email welcome setelah register"
git push -u origin feat/T-2.3-email-welcome
```

- Format commit: `feat | fix | refactor | docs | test | chore | perf | ci : deskripsi singkat` (imperatif, Bahasa Indonesia boleh).
- PR kecil (< ±400 baris diff) lebih cepat direview. Isi PR memakai `templates/PR_CHECKLIST.md`.
- Jangan force-push ke `main`. Jangan merge PR sendiri tanpa review mentor untuk task bertanda 🔒.
- Salah commit secret? **Jangan hanya menghapusnya** — berhenti, kabari mentor, secret harus di-rotate (lihat `11_SECURITY.md`).

## 8. Definition of Done (ringkas)

- [ ] Semua acceptance criteria task terpenuhi & terbukti (screenshot/log/curl)
- [ ] `npx tsc --noEmit` bersih
- [ ] Diuji di browser (mobile + desktop) untuk perubahan UI
- [ ] Diuji dengan **dua user** untuk apa pun yang menyentuh data
- [ ] Akun FREE, PRO, dan ADMIN diuji untuk fitur yang dikunci
- [ ] Tidak ada secret, `console.log`, `any` baru, atau kelas Tailwind dinamis
- [ ] Dokumentasi terkait diperbarui (`05_API_REFERENCE.md` bila ada endpoint, `.env.example` bila ada env)
- [ ] `DAILY_LOG.md` terisi; PR sesuai template

## 9. Etika bekerja dengan data

FinancePro menyimpan data keuangan orang. Jangan memakai data produksi di laptop/AI, jangan menempel data user ke chat AI, dan jangan membagikan tangkapan layar yang memuat data nyata. Gunakan data demo dari seed.
