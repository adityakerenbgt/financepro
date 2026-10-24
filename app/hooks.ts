'use client';

import { useState, useEffect } from 'react';

// ============================================================
// Shared data hook — fetches categories, accounts, goals, etc.
// Used by ALL forms for dropdown options
// ============================================================

export interface SetupData {
  categories: { id: string; name: string; type: string }[];
  accounts: { id: string; name: string; type: string; balance: number }[];
  goals: string[];
  debts: { name: string; type: string }[];
  assets: { name: string; type: string }[];
}

let cachedData: SetupData | null = null;
let fetchPromise: Promise<SetupData> | null = null;

async function fetchSetup(): Promise<SetupData> {
  const res = await fetch('/api/setup');
  const data = await res.json().catch(() => null);
  const result: SetupData = {
    categories: data?.categories || [],
    accounts: data?.accounts || [],
    goals: data?.goals || [],
    debts: data?.debts || [],
    assets: data?.assets || [],
  };
  // Jangan cache hasil kosong akibat error, agar percobaan berikutnya mengambil ulang
  if (res.ok) cachedData = result;
  else fetchPromise = null;
  return result;
}

export function useSetupData() {
  const [data, setData] = useState<SetupData>(cachedData || {
    categories: [], accounts: [], goals: [], debts: [], assets: [],
  });
  const [loading, setLoading] = useState(!cachedData);

  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }
    if (!fetchPromise) fetchPromise = fetchSetup();
    fetchPromise.then(d => { setData(d); setLoading(false); }).catch(() => { fetchPromise = null; setLoading(false); });
  }, []);

  // Force refresh (call after adding new category/account)
  const refresh = async () => {
    fetchPromise = null;
    cachedData = null;
    const d = await fetchSetup();
    setData(d);
  };

  return { ...data, loading, refresh };
}

// Invalidate cache (call from settings page after adding new entries)
export function invalidateSetupCache() {
  cachedData = null;
  fetchPromise = null;
}
