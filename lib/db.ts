// ============================================================
// Database Client (Prisma)
// Singleton pattern to prevent multiple instances in dev mode
// ============================================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Supabase pooler mode session hanya mengizinkan ~15 klien. Tanpa batas, Prisma membuka
// (jumlah CPU x 2 + 1) koneksi per instance sehingga mudah error EMAXCONNSESSION.
// Atur lewat DB_POOL_SIZE, atau isi connection_limit langsung di DATABASE_URL.
function datasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || /[?&]connection_limit=/.test(url)) return url;
  const limit = process.env.DB_POOL_SIZE || '5';
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=${limit}`;
}

export const prisma = globalForPrisma.prisma || new PrismaClient({ datasourceUrl: datasourceUrl() });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
