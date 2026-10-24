# 10 — Konvensi & Template Kode

Ikuti pola yang sudah ada di repo. Saat ragu, tiru file contoh yang disebut di setiap bagian.

## 1. Penamaan & gaya

- Variabel/fungsi `camelCase`; tipe/komponen `PascalCase`; konstanta `UPPER_SNAKE_CASE`; boolean berawalan `is/has/can/should`.
- File komponen `PascalCase.tsx` (mis. `ProGate.tsx`); route/halaman ikut aturan Next (`page.tsx`, `route.ts`).
- Kode & komentar **Bahasa Inggris** (komentar seperlunya — hanya untuk "kenapa" yang tidak jelas). Teks UI, pesan error ke user, dan email **Bahasa Indonesia**.
- Hindari `any` baru; untuk `catch` gunakan `unknown` bila memungkinkan. Jangan menambah `console.log`.
- Fungsi < 50 baris; file < 400 baris (maks 800). Pecah saat menyentuh file besar untuk fitur baru.
- Jangan mutasi objek/array bawaan — buat salinan (`{ ...obj }`, `[...arr]`).
- Alias impor: `@/lib/...`, `@/types`, `@/app/...`.

## 2. Template API route (pola standar)

```ts
// app/api/<resource>/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // (fitur PRO) const denied = requirePro(user); if (denied) return denied;   // setelah P0-2

    const { id, name } = await req.json();
    if (!id || !name?.trim()) {
      return NextResponse.json({ error: 'id dan name wajib diisi' }, { status: 400 });
    }

    // WAJIB: cek kepemilikan sebelum mengubah/menghapus
    const existing = await prisma.goal.findFirst({ where: { id, userId: user.userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.goal.update({ where: { id }, data: { goalName: name.trim() } });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Nama sudah ada' }, { status: 400 });
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });  // jangan bocorkan error.message
  }
}
```

Aturan:
- Identitas **hanya** dari `getUserFromRequest(req)`. Jangan terima `userId` dari body/query.
- `GET` mengembalikan data milik user saja: `where: { userId: user.userId, ... }`.
- Status: 400 validasi · 401 belum login · 403 dilarang (bukan ADMIN / bukan PRO) · 404 tidak ada/bukan milik · 409 duplikat · 500 lainnya.
- Logika bisnis bersama (dipakai API + bot) → `lib/services.ts`, bukan di route.
- Operasi yang mengubah banyak tabel (saldo!) → bungkus `prisma.$transaction([...])` (belum dilakukan di kode lama — T-DEBT-5).
- Endpoint khusus admin: cek `user.role === 'ADMIN'` → 403 (contoh: `app/api/admin/users/route.ts`).

## 3. Template halaman dashboard

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/auth-context';
import { useToast } from '@/app/providers';
import ProGate from '@/app/components/ProGate';
import { formatCurrency } from '@/lib/utils';

export default function GoalsPage() {
  const { role, plan, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/goals')
      .then(r => r.json())
      .then(setItems)
      .catch(() => toast('Gagal memuat data', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  // Halaman PRO: early return SETELAH semua hook dipanggil
  if (!authLoading && role !== 'ADMIN' && plan !== 'PRO') return <ProGate feature="Goals" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Goals</h1>
      {/* ... gunakan kelas: card, btn-primary, input-field, form-label ... */}
    </div>
  );
}
```

Aturan:
- Hooks selalu dipanggil di atas; `return` bersyarat setelahnya.
- Tampilkan **state loading, kosong, dan error** — bukan layar putih.
- Setelah aksi sukses: `toast('…')` + muat ulang data. Setelah menambah kategori/rekening: `invalidateSetupCache()` atau `refresh()` dari `useSetupData`.
- Menambah item sidebar: edit `allNavItems` di `app/dashboard/layout.tsx`.
- Ingat: `ProGate` hanyalah tampilan; keamanan sebenarnya di API.

## 4. Template fungsi service

```ts
// lib/services.ts
export async function getSomething(userId: string, filters?: { month?: string }) {
  const rows = await prisma.transaction.findMany({
    where: { userId, ...(filters?.month ? { month: filters.month } : {}) },
  });
  return rows.map(r => ({ /* bentuk data yang dibutuhkan UI */ }));
}
```
Argumen pertama selalu `userId`. Jangan panggil `getUserFromRequest` di dalam service (service tidak tahu soal HTTP).

## 5. Perubahan schema Prisma (checklist)

1. Ubah `prisma/schema.prisma` — beri `@@index` untuk kolom yang difilter, `onDelete: Cascade` untuk data milik user, `@@unique([userId, …])` bila nama harus unik per user.
2. `npx prisma db push` **di database lokalmu**. `npx prisma generate` bila perlu.
3. Perbarui `types/index.ts`, `04_DATABASE.md`, dan seed bila relevan.
4. Uji: buat, baca, ubah, hapus; uji dengan 2 user.
5. PR ditandai 🔒 → mentor review. **Mentor** yang menjalankan `db push` di produksi.

## 6. Uang, tanggal, ID

- **Format Rupiah:** `formatCurrency(n)` → `Rp1.234.567`. Input nominal pakai `<RpInput />`.
- **Parse nominal:** `parseCurrency("Rp1.000.000")` → `1000000`. ⚠ Fungsi ini membuang titik **dan** koma → tidak cocok untuk desimal.
- **Tanggal:** input `DD/MM/YYYY` atau `YYYY-MM-DD` → `parseDate()`. Untuk kolom `month`/`week` di Transaction pakai `getMonthString(date)` / `getWeekString(date)` — **jangan menulis string manual**. Bulan berlokal Indonesia: Jan Feb Mar Apr **Mei** Jun Jul **Agu** Sep **Okt** Nov **Des**.
- **ID bisnis:** `generateTxId`, `generateInvId` (`TRX-`, `INV-`).
- Status budget/goal: `getBudgetStatus`, `getGoalStatus` di `utils.ts` — jangan menduplikasi ambang batas.

### Zona waktu (jebakan nyata)
Vercel menjalankan server dalam **UTC**; pengguna di **WIB (UTC+7)**. Antara 00:00–07:00 WIB, "hari ini/bulan ini" yang dihitung di server masih hari/bulan **kemarin**. Akibatnya: batas awal bulan, cron, dan "hari ini" bisa meleset. Cara aman: kirim tanggal eksplisit dari client (`YYYY-MM-DD`), atau hitung dengan zona `Asia/Jakarta` (`date-fns-tz`, perlu izin dependency). Jadwal cron Vercel juga UTC (08:00 WIB = 01:00 UTC).

## 7. Styling

- Pakai kelas komponen di `app/globals.css`: `card`, `card-hover`, `kpi-card`, `btn-primary`, `btn-secondary`, `input-field`, `form-label`, `badge-success|warning|danger`.
- Palet gelap: latar `slate-800/900`, teks `white`/`slate-300/400`, aksen `blue-600`, PRO `yellow-500→orange-500`.
- **Tidak boleh** nama kelas dinamis. Salah: `` `bg-${c}-500` ``. Benar: peta statis `{ blue: 'bg-blue-500/20', … }` atau tulis kelas utuh.
- Ikon dari `lucide-react`; grafik dari `recharts`.
- Responsif dulu (mobile 360px), sidebar sudah punya mode collapse/mobile.

## 8. Git

- Branch: `feat/T-<id>-<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>`.
- Commit: `<type>: <deskripsi>` — `feat, fix, refactor, docs, test, chore, perf, ci`.
- Satu task = satu branch = satu PR. `git add` file spesifik (bukan `git add .`).
- Jangan commit: `.env*`, `node_modules`, `.next`, `tsconfig.tsbuildinfo`, file data pengguna.

## 9. Daftar "jangan"

- ❌ Query data user tanpa `userId` · ❌ update/delete tanpa cek kepemilikan
- ❌ Secret di kode, git, chat AI, tangkapan layar
- ❌ Percaya `plan`/`role` dari body request atau dari state client
- ❌ `db push` ke DB bersama/produksi
- ❌ `// @ts-ignore`, `as any` untuk membungkam error · ❌ `--no-verify`
- ❌ Dependency baru tanpa izin · ❌ kelas Tailwind dinamis
- ❌ Mengubah `middleware.ts`, `lib/auth.ts`, `schema.prisma`, `app/api/auth/*` tanpa review mentor
