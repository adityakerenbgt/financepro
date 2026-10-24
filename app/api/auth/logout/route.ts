import { NextResponse } from 'next/server';

// Logout hanya menghapus cookie sesi. (Versi lama menjalankan deleteMany({}) pada semua tabel
// tanpa filter userId, sehingga satu logout menghapus data seluruh pengguna.)
export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.delete('auth-token');
  return response;
}
