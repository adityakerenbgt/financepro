# FinancePro — Paket Serah Terima untuk Tim Magang

> Baca file ini dulu. Kamu akan meneruskan proyek **FinancePro** (aplikasi keuangan pribadi, Next.js 14) dengan cara **vibe coding** — AI menulis kode, **kamu yang bertanggung jawab** atas hasilnya. Dokumen di paket ini dibuat supaya kamu (dan AI kamu) tidak perlu menebak-nebak.

Dokumen dibuat: 29 September 2026 · Berdasarkan commit `f95acfd` (`feat: add freemium system with public signup and Pro feature gates`) · Type-check `tsc --noEmit`: **0 error**.

---

## 0. Untuk Owner/Mentor — lakukan SEBELUM paket ini dikirim ke intern

Kode saat ini punya kredensial yang tertanam di source. Jangan kirim repo ke intern sebelum ini beres:

- [ ] **Ganti password admin produksi.** Password admin lama tertulis polos di `prisma/seed.ts`, `app/api/auth/seed/route.ts`, `CLAUDE.md`, dan `AGENTS.md` (juga ada di riwayat git).
- [ ] **Ganti `JWT_SECRET`** (nilai lama tertulis di `CLAUDE.md`). Semua user akan ter-logout — itu normal.
- [ ] **Jangan pakai database produksi untuk intern.** Beri tiap intern Supabase project gratis sendiri atau Postgres lokal (lihat `docs/09_LOCAL_SETUP.md`).
- [ ] **Jangan bagikan file `.env` / `.env.local`.** Beri hanya `templates/.env.example`.
- [ ] Ganti `CLAUDE.md` & `AGENTS.md` di repo dengan versi bersih dari folder `ai-context/`.
- [ ] Push ke **GitHub private repo**, undang intern sebagai collaborator, aktifkan branch protection di `main`.
- [ ] Kerjakan Task **P0-1 s/d P0-3** (`docs/07_TASK_BACKLOG.md`) sebelum aplikasi dibuka ke publik.

---

## 1. Urutan baca (±90 menit)

| # | File | Isi | Waktu |
|---|------|-----|-------|
| 1 | `docs/01_PROJECT_OVERVIEW.md` | Apa & untuk siapa, paket FREE/PRO, tech stack | 10 mnt |
| 2 | `docs/09_LOCAL_SETUP.md` | Jalankan app di laptop kamu | 20 mnt |
| 3 | `docs/02_FILE_STRUCTURE.md` | Peta folder & file, "mau ubah X → buka file Y" | 15 mnt |
| 4 | `docs/03_ARCHITECTURE.md` | Cara kerja auth, plan gating, data isolation | 15 mnt |
| 5 | `docs/06_CURRENT_STATUS.md` | **Yang sudah jadi, setengah jadi, dan rusak** (hasil audit) | 15 mnt |
| 6 | `docs/08_VIBE_CODING_GUIDE.md` | Aturan main + template prompt untuk AI kamu | 15 mnt |
| 7 | `docs/07_TASK_BACKLOG.md` | Daftar tugas lengkap per bulan, dengan acceptance criteria | dibaca saat mulai task |

Referensi (buka saat perlu): `04_DATABASE.md`, `05_API_REFERENCE.md`, `10_CONVENTIONS.md`, `11_SECURITY.md`, `12_GLOSSARY.md`.

---

## 2. Isi paket

```
FinancePro_Intern_Handover/
├── README_START_HERE.md          ← kamu di sini
├── docs/
│   ├── 01_PROJECT_OVERVIEW.md    Ringkasan produk, paket, stack
│   ├── 02_FILE_STRUCTURE.md      Peta seluruh file + cheat sheet
│   ├── 03_ARCHITECTURE.md        Alur data, auth, plan gating, bot
│   ├── 04_DATABASE.md            Semua model Prisma + keanehan data
│   ├── 05_API_REFERENCE.md       Semua endpoint (auth, plan check, body)
│   ├── 06_CURRENT_STATUS.md      Selesai / setengah / rusak + temuan audit
│   ├── 07_TASK_BACKLOG.md        Backlog bertahap (Bulan 1–6) + tech debt
│   ├── 08_VIBE_CODING_GUIDE.md   Cara kerja bareng AI + prompt template
│   ├── 09_LOCAL_SETUP.md         Instalasi, env, DB, troubleshooting
│   ├── 10_CONVENTIONS.md         Pola kode & template siap pakai
│   ├── 11_SECURITY.md            Aturan keamanan + checklist PR
│   └── 12_GLOSSARY.md            Istilah domain (Pemasukan, Piutang, dst.)
├── ai-context/
│   ├── CLAUDE.md                 Taruh di ROOT repo (konteks untuk Claude Code/Cursor)
│   └── AGENTS.md                 Sama, untuk Codex/agen lain
└── templates/
    ├── .env.example              Semua env var yang dibutuhkan
    ├── TASK_TEMPLATE.md          Format catatan per task
    ├── PR_CHECKLIST.md           Checklist sebelum minta review
    └── DAILY_LOG.md              Catatan harian (untuk laporan magang)
```

---

## 3. Mulai dalam 5 perintah

```bash
git clone <URL-repo-private>
cd financepro && npm install
cp templates/.env.example .env.local      # lalu isi DATABASE_URL & JWT_SECRET milikmu
npx prisma db push && npm run db:seed     # buat tabel + akun admin lokal
npm run dev                               # buka http://localhost:3000
```

Detail & troubleshooting: `docs/09_LOCAL_SETUP.md`.

---

## 4. Lima hal yang WAJIB kamu tahu hari pertama

1. **Semua query database harus difilter `userId`.** Ini aplikasi multi-user; satu query tanpa filter = data user lain bocor. (Saat ini masih ada 5 handler yang lolos — itu bug, lihat P0-1.)
2. **Batasan paket FREE/PRO saat ini hanya di sisi tampilan (client).** Server belum memeriksa. Jangan andalkan `ProGate` untuk keamanan — lihat P0-2.
3. **Middleware pakai `jose`, API route pakai `jsonwebtoken`.** Jangan tertukar; middleware jalan di Edge Runtime.
4. **Jangan `db push` ke database bersama.** Ubah schema hanya di database lokal/milikmu, lalu minta mentor review sebelum merge.
5. **Jangan pernah menempel secret (password, token, `.env`) ke AI atau ke git.**

Selamat bekerja. Kalau ragu, tanya mentor — lebih murah bertanya 5 menit daripada memperbaiki 5 jam.
