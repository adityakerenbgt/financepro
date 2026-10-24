# Checklist Pull Request

Salin ke deskripsi PR. Centang hanya yang **benar-benar** sudah kamu lakukan.

## Ringkasan
- Task: `<ID>` — <judul>
- Apa yang berubah (1–3 kalimat):
- Screenshot / rekaman (untuk perubahan UI), hasil curl (untuk API):

## Kualitas
- [ ] `npx tsc --noEmit` bersih
- [ ] `npm run build` berhasil (wajib untuk perubahan UI besar, config, atau dependency)
- [ ] Sudah membaca **seluruh** `git diff`; tidak ada perubahan di luar lingkup task
- [ ] Tidak ada `console.log`, kode yang dikomentari, `// @ts-ignore`, atau `any` baru
- [ ] Tidak ada kelas Tailwind dinamis
- [ ] Teks UI Bahasa Indonesia; kode/komentar Bahasa Inggris
- [ ] File yang saya buat/ubah < 400 baris (atau saya jelaskan kenapa lebih)

## Fungsi
- [ ] Semua acceptance criteria di `07_TASK_BACKLOG.md` terpenuhi (bukti di catatan task)
- [ ] Diuji di browser: desktop **dan** mobile (untuk UI)
- [ ] Diuji dengan akun **FREE**, **PRO**, dan **ADMIN** (bila fitur dikunci/berbeda per plan)
- [ ] Diuji dengan **dua user** (user kedua tidak bisa melihat/mengubah data user pertama)
- [ ] State loading, kosong, dan error sudah ditangani

## Keamanan (lihat `docs/11_SECURITY.md`)
- [ ] Query baru difilter `userId` dari token
- [ ] Update/delete memeriksa kepemilikan
- [ ] Endpoint fitur PRO memeriksa plan di server
- [ ] Input divalidasi (`null`, `""`, `NaN`, negatif, terlalu panjang)
- [ ] Tidak ada secret/password/token di diff (`git diff | grep -iE "secret|password|token|key"`)
- [ ] Respons error tidak membocorkan `error.message`
- [ ] Endpoint publik/cron/webhook baru dilindungi (rate limit / secret)

## Database (jika ada perubahan schema) 🔒
- [ ] Sudah `db push` di DB **lokal** dan diuji
- [ ] Indeks & `onDelete` dipikirkan; dampak ke data lama dijelaskan di PR
- [ ] `types/index.ts`, `docs/04_DATABASE.md`, seed diperbarui
- [ ] **Belum** dijalankan di produksi (mentor yang menjalankan)

## Dokumentasi & operasional
- [ ] `docs/05_API_REFERENCE.md` diperbarui (bila ada endpoint)
- [ ] `templates/.env.example` diperbarui (bila ada env var baru)
- [ ] `DAILY_LOG.md` terisi
- [ ] Commit mengikuti format `type: deskripsi`; `git status` bersih dari `.env`

## Untuk reviewer
- Hal yang saya ragukan / minta dilihat lebih teliti:
- Risiko jika salah:
