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
  'Password tidak cocok': 'Passwords do not match',
  'Password minimal 8 karakter': 'Password must be at least 8 characters',
  'Username hanya boleh huruf, angka, dan underscore': 'Username may only contain letters, numbers, and underscores',
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
