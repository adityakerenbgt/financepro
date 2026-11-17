import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from './sentryScrub';

// Opsi bersama server/edge/browser. Tanpa DSN Sentry tidak diinisialisasi sama sekali.
export function sentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: !!dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0, // hanya error, tanpa performance tracing
    sendDefaultPii: false,
    maxBreadcrumbs: 20,
    // console.error dipakai di seluruh route API untuk 500; tangkap sebagai event (pesan sudah dibersihkan di beforeSend)
    integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
    beforeSend: (event: any) => scrubEvent(event),
    beforeBreadcrumb: (b: any) => (b.category === 'console' || b.category === 'fetch' || b.category === 'xhr' ? { ...b, data: undefined } : b),
  };
}
