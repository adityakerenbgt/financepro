import { NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';

function sha(s: string): Buffer {
  return createHash('sha256').update(s).digest();
}

// Vercel Cron mengirim `Authorization: Bearer <CRON_SECRET>` bila env CRON_SECRET diset.
// Tertutup (false) bila CRON_SECRET tidak diset. Perbandingan hash + timingSafeEqual agar tidak bocor lewat waktu respons.
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  return timingSafeEqual(sha(header), sha(`Bearer ${secret}`));
}
