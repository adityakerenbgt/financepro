// Helper fetch untuk komponen client: tidak pernah mengembalikan objek error sebagai data.
// Dipakai agar halaman tidak crash (mis. `accounts.filter is not a function`) saat API membalas error.

export async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // body kosong / bukan JSON
  }
  if (!res.ok) throw new Error(data?.error || `Request gagal (${res.status})`);
  return data as T;
}

// Untuk endpoint yang seharusnya mengembalikan array.
export async function fetchList<T = any>(url: string): Promise<T[]> {
  const data = await fetchJson<unknown>(url);
  if (!Array.isArray(data)) throw new Error('Format respons tidak valid');
  return data as T[];
}
