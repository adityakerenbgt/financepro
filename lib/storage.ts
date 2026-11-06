import { randomUUID } from 'crypto';
import { StorageClient } from '@supabase/storage-js';

// Bucket PRIVAT untuk bukti pembayaran. File hanya bisa dilihat lewat signed URL berumur pendek (dibuat server).
export const PROOF_BUCKET = 'payment-proofs';
export const PROOF_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export const PROOF_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('Penyimpanan bukti pembayaran belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
    this.name = 'StorageNotConfiguredError';
  }
}

// SERVICE ROLE KEY = rahasia server. Hanya dibaca di sini (kode server), tidak pernah berawalan NEXT_PUBLIC_.
function client(): StorageClient {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new StorageNotConfiguredError();
  return new StorageClient(`${url}/storage/v1`, { apikey: key, Authorization: `Bearer ${key}` });
}

export function isStorageConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Path objek selalu di bawah folder userId, nama acak (UUID) sehingga tidak bisa ditebak.
export function newProofPath(userId: string, contentType: string): string {
  return `${userId}/${randomUUID()}.${PROOF_TYPES[contentType]}`;
}

export function isValidProofPath(userId: string, path: string): boolean {
  const escaped = userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}/[0-9a-f-]{36}\\.(jpg|png|webp|pdf)$`).test(path);
}

// URL unggah bertanda tangan sekali pakai; browser mengunggah langsung ke Supabase.
export async function createProofUploadUrl(path: string): Promise<{ signedUrl: string; token: string }> {
  const { data, error } = await client().from(PROOF_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Gagal membuat URL unggah: ${error?.message ?? 'tidak ada data'}`);
  return { signedUrl: data.signedUrl, token: data.token };
}

export async function proofExists(path: string): Promise<boolean> {
  const { data } = await client().from(PROOF_BUCKET).exists(path);
  return data === true;
}

// Dipakai T-3.3: admin melihat bukti lewat signed URL singkat.
export async function createProofViewUrl(path: string, expiresInSec = 60): Promise<string> {
  const { data, error } = await client().from(PROOF_BUCKET).createSignedUrl(path, expiresInSec);
  if (error || !data) throw new Error(`Gagal membuat URL bukti: ${error?.message ?? 'tidak ada data'}`);
  return data.signedUrl;
}

// Membuat bucket privat bila belum ada (idempoten). Batas ukuran & tipe file dipaksa oleh Supabase di sisi server.
export async function ensureProofBucket(): Promise<'created' | 'exists'> {
  const storage = client();
  const { data } = await storage.getBucket(PROOF_BUCKET);
  if (data) return 'exists';
  const { error } = await storage.createBucket(PROOF_BUCKET, {
    public: false,
    fileSizeLimit: PROOF_MAX_BYTES,
    allowedMimeTypes: Object.keys(PROOF_TYPES),
  });
  if (error) throw new Error(`Gagal membuat bucket: ${error.message}`);
  return 'created';
}
