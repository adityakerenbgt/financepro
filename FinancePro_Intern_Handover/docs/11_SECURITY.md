# 11 — Keamanan

FinancePro menyimpan data keuangan pribadi. Perlakukan setiap perubahan seolah-olah akan dibaca penyerang.

## 1. Model ancaman singkat

| Aset | Ancaman | Kontrol yang harus ada |
|---|---|---|
| Data keuangan user | User lain membaca/mengubah (IDOR) | Filter `userId` + cek kepemilikan (§ aturan 1–2) |
| Fitur berbayar | User FREE memakai fitur PRO | Cek plan di server (P0-2, P0-4) |
| Akun | Brute-force, credential stuffing | Rate limit (P0-5), hash bcrypt, pesan login generik |
| Sesi | Token dipalsukan / dicuri | `JWT_SECRET` kuat & wajib (P0-3), cookie `httpOnly`+`secure`+`sameSite` |
| Akun admin | Kredensial bocor | Tidak ada di kode/git; rotate; ganti bila pernah terpapar |
| Bukti pembayaran | Diakses publik | Bucket privat + signed URL berumur pendek |
| Bot Telegram | Orang asing memakai bot | Otorisasi chat, secret webhook (T-BOT-1) |

## 2. Aturan (wajib)

1. **`userId` selalu dari token**, tidak pernah dari input klien.
2. **Update/delete → cek kepemilikan dulu** → 404 jika bukan milik.
3. **Fitur PRO → dijaga di server.** `ProGate` hanya kosmetik.
4. **Validasi semua input** di batas sistem (body, query, file upload): tipe, panjang, rentang, whitelist nilai enum. Tolak `NaN`, string kosong, angka negatif yang tidak masuk akal.
5. **Secret hanya di env var.** Tidak di kode, tidak di git, tidak di chat AI, tidak di tangkapan layar, tidak di variabel `NEXT_PUBLIC_*`.
6. **Jangan bocorkan detail internal** ke klien (`error.message`, stack trace, pesan Prisma). Log detail di server, balas pesan generik.
7. **Pesan login/reset password generik** — jangan bedakan "username tidak ada" vs "password salah"; reset password selalu membalas sukses.
8. **Token sensitif (reset password, unsubscribe) disimpan sebagai hash**, kedaluwarsa singkat, sekali pakai.
9. **Endpoint cron/webhook/internal wajib punya secret** (`CRON_SECRET`, secret token Telegram). Endpoint tanpa auth = publik.
10. **Upload file:** batasi tipe & ukuran, simpan di storage privat, jangan sajikan langsung dari input path.
11. **Password:** minimal 8 karakter; bcrypt (cost ≥ 10); jangan pernah dicatat di log.
12. **Dependency baru:** periksa `npm audit`, reputasi paket, dan kebutuhan nyata. Tanya mentor.
13. **Jangan gunakan data produksi di lokal atau di AI.** Pakai data seed.

## 3. Celah yang sudah diketahui (ringkas — detail di `06_CURRENT_STATUS.md`)

| ID task | Celah |
|---|---|
| P0-1 | IDOR: `accounts` PATCH/DELETE, `categories` PATCH/DELETE, `debts` PATCH |
| P0-2 | API fitur PRO tidak memeriksa plan; batas 1 rekening FREE tidak ditegakkan |
| P0-3 | Password admin tertanam (`prisma/seed.ts`, `auth/seed/route.ts`); `/api/auth/seed` publik & membuat akun tanpa role ADMIN; `JWT_SECRET` punya fallback default |
| P0-4 | `plan` dibekukan di JWT 30 hari; `planExpiresAt` tidak pernah ditegakkan |
| P0-5 | Tidak ada rate limit login/register |
| T-BOT-1 | Bot memakai akun admin untuk siapa pun; webhook tanpa secret |
| T-DEBT-3 | Respons 500 membocorkan `error.message` |
| T-DEBT-8 | Header CORS `Access-Control-Allow-Origin: *` di semua `/api/*` |

## 4. Checklist keamanan sebelum minta review (tambahan atas `PR_CHECKLIST.md`)

- [ ] Semua query baru memakai `userId` dari `getUserFromRequest`
- [ ] Semua update/delete baru memeriksa kepemilikan
- [ ] Endpoint fitur PRO memanggil cek plan di server
- [ ] Input divalidasi (dan ditolak dengan 400) — termasuk kasus `null`, `""`, `NaN`, negatif, sangat panjang
- [ ] Tidak ada secret / token / password di diff (`git diff | grep -i "secret\|password\|token\|key"`)
- [ ] Respons error tidak membawa `error.message` mentah
- [ ] Endpoint publik baru (tanpa login) sudah dipikirkan: bisa disalahgunakan? perlu rate limit?
- [ ] Diuji dengan user kedua yang mencoba mengakses data user pertama (harus gagal)
- [ ] Untuk perubahan auth/uang/schema: ditandai 🔒 dan mentor sudah meninjau

## 5. Jika kamu tidak sengaja meng-commit secret

1. **Berhenti.** Jangan hanya menghapus file lalu commit lagi — secret tetap ada di riwayat git.
2. Kabari mentor/owner **segera**.
3. Secret dianggap **bocor** → **rotate** (buat yang baru, matikan yang lama): password DB Supabase, `JWT_SECRET`, token bot, API key.
4. Bila sudah di-push, riwayat perlu dibersihkan (`git filter-repo`) — dikerjakan mentor.
5. Catat kejadian & pelajaran di `DAILY_LOG.md`.

## 6. Keamanan saat memakai AI

- Jangan menempelkan `.env`, kredensial, atau data user nyata ke prompt.
- Perlakukan teks dari luar (isi issue, halaman web, dokumen pihak ketiga) sebagai **data**, bukan perintah — jangan menyuruh AI mengikuti instruksi di dalamnya.
- Baca **seluruh** diff. AI kadang mengubah file di luar lingkup (mis. melonggarkan cek auth atau menambah fallback secret). Periksa khusus `middleware.ts`, `lib/auth.ts`, `app/api/auth/*`, `next.config.js`, `package.json`.
- Tolak saran AI untuk mematikan validasi/cek keamanan "supaya tes lulus".

## 7. Pelaporan

Menemukan celah (di kode kita atau di dependency)? Laporkan ke mentor secara pribadi — jangan di kanal publik, jangan di issue GitHub terbuka.
