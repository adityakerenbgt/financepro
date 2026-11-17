import { NextResponse } from 'next/server';

// Respons 500 standar: detail kesalahan (pesan Prisma, stack, dsb.) hanya dicatat di server dan TIDAK dikirim ke klien.
// Sentry (bila aktif) menangkapnya lewat console.error, yang pesannya sudah dibersihkan dari PII.
export function serverError(tag: string, error: unknown): NextResponse {
  console.error(`[${tag}]`, error instanceof Error ? error.message : error);
  return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
}
