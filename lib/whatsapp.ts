// Kontak WhatsApp admin untuk info pembayaran. Nomor dibaca dari NEXT_PUBLIC_WHATSAPP_NUMBER
// (format internasional tanpa "+", mis. 6281234567890). Nomor ini memang tampil publik di aplikasi.

export function whatsappNumber(): string | null {
  const n = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '');
  return /^\d{8,15}$/.test(n) ? n : null;
}

// Tautan wa.me dengan pesan terisi. null bila nomor belum dikonfigurasi.
export function whatsappUrl(message: string): string | null {
  const n = whatsappNumber();
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : null;
}
