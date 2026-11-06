// Membuat bucket privat `payment-proofs` di Supabase (sekali jalan, idempoten).
// Jalankan:  npm run storage:setup   (butuh SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY di .env)
import { ensureProofBucket, isStorageConfigured, PROOF_BUCKET } from '../lib/storage';

async function main() {
  if (!isStorageConfigured()) {
    throw new Error('Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env terlebih dahulu.');
  }
  const result = await ensureProofBucket();
  console.log(result === 'created' ? `✓ Bucket privat "${PROOF_BUCKET}" dibuat` : `✓ Bucket "${PROOF_BUCKET}" sudah ada`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
