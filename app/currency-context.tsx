'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode, Fragment,
} from 'react';
import {
  CurrencyCode, DEFAULT_CURRENCY, RatesPayload, isSupportedCurrency, setActiveCurrency,
} from '@/lib/currency';

export const CURRENCY_COOKIE = 'fp-currency';
const CACHE_KEY = 'fp-rates-v1';
const CACHE_TTL_MS = 60 * 60 * 1000;     // pakai cache lokal maksimal 1 jam
const REFRESH_MS = 30 * 60 * 1000;       // segarkan otomatis tiap 30 menit selama tab terbuka

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  payload: RatesPayload | null;
  rate: number | null;   // 1 IDR = rate unit mata uang aktif (null bila IDR / belum ada)
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  payload: null,
  rate: null,
  loading: false,
  error: false,
  refresh: async () => {},
});

function readCache(): { payload: RatesPayload; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.payload?.rates && typeof parsed.savedAt === 'number') return parsed;
  } catch {
    // abaikan
  }
  return null;
}

export function CurrencyProvider({ initialCurrency, children }: { initialCurrency: CurrencyCode; children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(initialCurrency);
  const [payload, setPayload] = useState<RatesPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rates');
      if (!res.ok) throw new Error(String(res.status));
      const data: RatesPayload = await res.json();
      setPayload(data);
      setError(false);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ payload: data, savedAt: Date.now() }));
      } catch {
        // abaikan
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat kurs: cache lokal dulu (instan), lalu segarkan bila basi. Segarkan berkala.
  useEffect(() => {
    const cached = readCache();
    if (cached) setPayload(cached.payload);
    if (!cached || Date.now() - cached.savedAt > CACHE_TTL_MS) refresh();

    const timer = setInterval(refresh, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const c = readCache();
      if (!c || Date.now() - c.savedAt > CACHE_TTL_MS) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const setCurrency = useCallback((c: CurrencyCode) => {
    if (!isSupportedCurrency(c)) return;
    setCurrencyState(c);
    try {
      document.cookie = `${CURRENCY_COOKIE}=${c}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // abaikan
    }
  }, []);

  const rate = currency === 'IDR' ? null : payload?.rates[currency] ?? null;

  // Set state modul SEBELUM anak dirender agar formatMoney() langsung memakai mata uang/kurs terbaru.
  setActiveCurrency(currency, rate);

  const value = useMemo(
    () => ({ currency, setCurrency, payload, rate, loading, error, refresh }),
    [currency, setCurrency, payload, rate, loading, error, refresh],
  );

  // Anak di-remount saat mata uang berganti (atau kurs pertama kali tersedia) supaya semua halaman
  // yang memakai formatMoney() ikut menampilkan angka baru tanpa perlu diubah satu per satu.
  const remountKey = `${currency}:${rate ? 'r' : 'n'}`;

  return (
    <CurrencyContext.Provider value={value}>
      <Fragment key={remountKey}>{children}</Fragment>
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
