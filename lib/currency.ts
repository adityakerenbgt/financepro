// Mata uang tampilan. Semua nilai di database tetap Rupiah (IDR); konversi hanya untuk tampilan.

export const SUPPORTED_CURRENCIES = [
  'IDR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'KRW',
  'THB', 'INR', 'SAR', 'AED', 'NZD', 'PHP', 'VND', 'TWD', 'BRL', 'ZAR', 'TRY', 'SEK', 'NOK', 'DKK',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'IDR';

const ZERO_DECIMAL = new Set<string>(['IDR', 'JPY', 'KRW', 'VND']);

export function isSupportedCurrency(code: string | undefined | null): code is CurrencyCode {
  return !!code && (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

// ---- State modul: dibaca oleh formatMoney di komponen mana pun (termasuk tooltip chart) ----

let activeCurrency: CurrencyCode = DEFAULT_CURRENCY;
let activeRate = 1; // 1 IDR = activeRate unit mata uang aktif

export function setActiveCurrency(currency: CurrencyCode, rate: number | null) {
  if (currency === 'IDR' || !rate || !isFinite(rate) || rate <= 0) {
    activeCurrency = 'IDR';
    activeRate = 1;
  } else {
    activeCurrency = currency;
    activeRate = rate;
  }
}

export function getActiveCurrency(): CurrencyCode {
  return activeCurrency;
}

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    const digits = ZERO_DECIMAL.has(currency) ? 0 : 2;
    f = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(currency, f);
  }
  return f;
}

// Menerima nilai dalam IDR, mengembalikan string dalam mata uang aktif.
export function formatMoney(amountIDR: number): string {
  const value = (amountIDR || 0) * activeRate;
  if (activeCurrency === 'IDR') {
    return (value < 0 ? '-' : '') + 'Rp' + Math.round(Math.abs(value)).toLocaleString('id-ID');
  }
  return getFormatter(activeCurrency).format(value);
}

export interface RatesPayload {
  base: 'IDR';
  date: string;      // tanggal data kurs dari penyedia
  fetchedAt: string; // kapan server mengambilnya
  source: string;
  rates: Record<string, number>; // 1 IDR = rates[CODE]
}

const compactFormatters = new Map<string, Intl.NumberFormat>();

// Format ringkas untuk sumbu chart (nilai masuk dalam IDR). lang menentukan singkatan untuk Rupiah (jt/rb vs M/K).
export function formatCompactMoney(amountIDR: number, lang: 'id' | 'en' = 'id'): string {
  const value = (amountIDR || 0) * activeRate;
  if (activeCurrency === 'IDR' && lang === 'id') {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const trim = (n: number) => n.toFixed(1).replace(/\.0$/, '');
    if (abs >= 1e12) return `${sign}${trim(abs / 1e12)}T`;
    if (abs >= 1e9) return `${sign}${trim(abs / 1e9)}M`;
    if (abs >= 1e6) return `${sign}${trim(abs / 1e6)}jt`;
    if (abs >= 1e3) return `${sign}${trim(abs / 1e3)}rb`;
    return `${sign}${Math.round(abs)}`;
  }
  const key = activeCurrency;
  let f = compactFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-US', { style: 'currency', currency: key, notation: 'compact', maximumFractionDigits: 1 });
    compactFormatters.set(key, f);
  }
  return f.format(value);
}
