'use client';

import { useEffect } from 'react';

// Mendaftarkan service worker hanya di produksi (di dev cache SW mengganggu hot reload).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => { /* PWA opsional; abaikan kegagalan */ });
  }, []);
  return null;
}
