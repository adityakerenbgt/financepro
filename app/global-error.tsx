'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Menangkap error render React yang tidak tertangani, melapor ke Sentry (bila aktif), dan menampilkan layar cadangan.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="id">
      <body style={{ fontFamily: 'sans-serif', background: '#0f172a', color: '#e2e8f0', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 20 }}>Terjadi kesalahan / Something went wrong</h1>
          <p style={{ color: '#94a3b8' }}>Silakan coba lagi. / Please try again.</p>
          <button onClick={reset} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: 0, background: '#2563eb', color: '#fff', cursor: 'pointer' }}>Coba lagi / Retry</button>
        </div>
      </body>
    </html>
  );
}
