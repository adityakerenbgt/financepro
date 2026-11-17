import { createHash } from 'crypto';
import { JWT_SECRET } from './env';

// Menandai event Sentry dengan ID user yang di-hash (tidak bisa dibalik tanpa JWT_SECRET).
// Sentry TIDAK diimpor di sini (supaya tidak ikut ter-bundle ke setiap route saat Sentry nonaktif); sentry.server.config.ts
// memasang fungsi `setUser` di globalThis hanya bila DSN diisi. Tanpa DSN fungsi ini tidak melakukan apa-apa.
export function tagSentryUser(userId: string): void {
  try {
    const set = (globalThis as { __fpSentrySetUser?: (u: { id: string }) => void }).__fpSentrySetUser;
    if (!set) return;
    set({ id: createHash('sha256').update(`${JWT_SECRET}:${userId}`).digest('hex').slice(0, 16) });
  } catch { /* pelacakan error tidak boleh mengganggu request */ }
}
