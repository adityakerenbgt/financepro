import { NextResponse } from 'next/server';
import { SUPPORTED_CURRENCIES, type RatesPayload } from '@/lib/currency';

// Kurs diambil dari penyedia gratis tanpa API key. Urutan: dua mirror fawazahmed0/exchange-api, lalu open.er-api.com.
// Data penyedia diperbarui harian; server meng-cache 1 jam dan menyimpan salinan terakhir yang berhasil.
export const dynamic = 'force-dynamic';

const REVALIDATE_SEC = 3600;
const TIMEOUT_MS = 8000;

let lastGood: RatesPayload | null = null;

function pick(rates: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const code of SUPPORTED_CURRENCIES) {
    const v = rates[code];
    if (typeof v === 'number' && isFinite(v) && v > 0) out[code] = v;
  }
  out.IDR = 1;
  return out;
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SEC },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fromFawaz(url: string, source: string): Promise<RatesPayload> {
  const d = await getJson(url);
  const upper: Record<string, number> = {};
  for (const [k, v] of Object.entries(d.idr as Record<string, number>)) upper[k.toUpperCase()] = v;
  return { base: 'IDR', date: d.date, fetchedAt: new Date().toISOString(), source, rates: pick(upper) };
}

async function fromErApi(): Promise<RatesPayload> {
  const d = await getJson('https://open.er-api.com/v6/latest/IDR');
  if (d.result !== 'success') throw new Error('er-api gagal');
  return {
    base: 'IDR',
    date: new Date(d.time_last_update_utc).toISOString().slice(0, 10),
    fetchedAt: new Date().toISOString(),
    source: 'open.er-api.com',
    rates: pick(d.rates),
  };
}

export async function GET() {
  const attempts: (() => Promise<RatesPayload>)[] = [
    () => fromFawaz('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/idr.json', 'fawazahmed0/exchange-api (jsDelivr)'),
    () => fromFawaz('https://latest.currency-api.pages.dev/v1/currencies/idr.json', 'fawazahmed0/exchange-api (pages.dev)'),
    () => fromErApi(),
  ];

  for (const attempt of attempts) {
    try {
      const payload = await attempt();
      if (Object.keys(payload.rates).length > 5) {
        lastGood = payload;
        return NextResponse.json(payload, { headers: { 'Cache-Control': 'public, max-age=300' } });
      }
    } catch {
      // coba sumber berikutnya
    }
  }

  if (lastGood) {
    return NextResponse.json({ ...lastGood, stale: true }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  }
  return NextResponse.json({ error: 'Kurs tidak tersedia saat ini' }, { status: 502 });
}
