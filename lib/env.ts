// Edge-safe: hanya process.env, tanpa API Node. Dipakai middleware (Edge) dan API routes (Node).
const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  throw new Error('JWT_SECRET wajib diisi (minimal 32 karakter). Lihat templates/.env.example.');
}

export const JWT_SECRET: string = secret;
