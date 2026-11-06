'use client';

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

export type Lang = 'id' | 'en';

export const LANG_COOKIE = 'fp-lang';

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  // t('Teks Indonesia', 'English text')
  t: (id: string, en?: string) => string;
  // Menerjemahkan pesan error dari API (server membalas dalam Bahasa Indonesia)
  tError: (message: string) => string;
}

const API_ERRORS_EN: Record<string, string> = {
  'Username atau password salah': 'Incorrect username or password',
  'Username dan password harus diisi': 'Username and password are required',
  'Username dan password wajib diisi': 'Username and password are required',
  'Terlalu banyak percobaan, coba lagi nanti.': 'Too many attempts, please try again later.',
  'Terjadi kesalahan server': 'A server error occurred',
  'Username sudah digunakan': 'Username is already taken',
  'Email sudah digunakan': 'Email is already in use',
  'Email wajib diisi': 'Email is required',
  'Tautan tidak valid atau sudah kedaluwarsa': 'This link is invalid or has expired',
  'Jika email terdaftar, kami telah mengirim tautan untuk mengatur ulang password.': 'If the email is registered, we have sent a link to reset your password.',
  'Format email tidak valid': 'Invalid email format',
  'Password tidak cocok': 'Passwords do not match',
  'Password minimal 8 karakter': 'Password must be at least 8 characters',
  'Username hanya boleh huruf, angka, dan underscore': 'Username may only contain letters, numbers, and underscores',
  'Kamu harus menyetujui Syarat & Ketentuan dan Kebijakan Privasi': 'You must accept the Terms of Service and Privacy Policy',
  'Jenis file tidak didukung (gunakan JPG, PNG, WEBP, atau PDF)': 'Unsupported file type (use JPG, PNG, WEBP, or PDF)',
  'Ukuran file tidak valid': 'Invalid file size',
  'Ukuran file maksimal 2 MB': 'Maximum file size is 2 MB',
  'Kamu masih punya permintaan pembayaran yang menunggu konfirmasi': 'You still have a payment request awaiting confirmation',
  'Unggah bukti belum tersedia saat ini. Silakan hubungi admin.': 'Proof upload is not available right now. Please contact the admin.',
  'Paket tidak valid': 'Invalid plan',
  'Bukti pembayaran tidak valid': 'Invalid payment proof',
  'Bukti pembayaran belum terunggah': 'The payment proof has not been uploaded',
  'Bukti pembayaran ini sudah dipakai': 'This payment proof has already been used',
  'Catatan maksimal 500 karakter': 'Note can be at most 500 characters',
  'id wajib diisi': 'id is required',
  'Aksi tidak valid': 'Invalid action',
  'Alasan penolakan wajib diisi': 'A rejection reason is required',
  'Alasan maksimal 500 karakter': 'Reason can be at most 500 characters',
  'Permintaan tidak ditemukan': 'Request not found',
  'Permintaan ini sudah diproses': 'This request has already been processed',
  'Penyimpanan bukti belum dikonfigurasi': 'Proof storage is not configured',
  'Tautan tidak valid': 'Invalid link',
  'Format tanggal tidak valid': 'Invalid date format',
  'Jenis transaksi tidak valid': 'Invalid transaction type',
  'Nominal harus lebih dari 0': 'Amount must be greater than 0',
  'Deskripsi wajib diisi (maksimal 100 karakter)': 'Description is required (max 100 characters)',
  'Catatan maksimal 300 karakter': 'Note can be at most 300 characters',
  'Frekuensi tidak valid': 'Invalid frequency',
  'Tanggal mulai tidak valid': 'Invalid start date',
  'Tanggal akhir tidak valid': 'Invalid end date',
  'Tanggal mulai tidak boleh lebih dari 1 tahun yang lalu': 'The start date cannot be more than 1 year ago',
  'Tanggal mulai terlalu jauh ke depan': 'The start date is too far in the future',
  'Tanggal akhir tidak boleh sebelum tanggal mulai': 'The end date cannot be before the start date',
  'Kategori tidak ditemukan': 'Category not found',
  'Rekening tidak ditemukan': 'Account not found',
  'Maksimal 50 transaksi berulang': 'At most 50 recurring transactions',
  'Jadwal ini sudah berakhir': 'This schedule has already ended',
  'Tidak ditemukan': 'Not found',
  'Permintaan tidak valid': 'Invalid request',
  'Tidak ada baris untuk diproses': 'There are no rows to process',
  'Mode jenis tidak valid': 'Invalid transaction type mode',
  'Rekening bawaan tidak valid': 'Invalid default account',
  'Fitur PRO': 'PRO feature',
  'Nama rekening sudah ada': 'Account name already exists',
  'Nama kategori sudah ada': 'Category name already exists',
};

const LangContext = createContext<LangContextType>({
  lang: 'id',
  setLang: () => {},
  t: (id) => id,
  tError: (m) => m,
});

export function LanguageProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
    } catch {
      // abaikan (mis. cookie diblokir)
    }
  }, []);

  const value = useMemo<LangContextType>(
    () => ({
      lang,
      setLang,
      t: (id, en) => (lang === 'en' && en !== undefined ? en : id),
      tError: (m) => {
        if (lang !== 'en') return m;
        if (API_ERRORS_EN[m]) return API_ERRORS_EN[m];
        const limit = m.match(/^Paket FREE dibatasi (\d+) rekening/);
        if (limit) return `The FREE plan is limited to ${limit[1]} account(s). Upgrade to PRO to add more.`;
        return m;
      },
    }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

// Locale untuk format tanggal/angka bila dibutuhkan
export function localeOf(lang: Lang): string {
  return lang === 'en' ? 'en-US' : 'id-ID';
}
