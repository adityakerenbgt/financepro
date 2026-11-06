// Pengiriman email transaksional lewat Resend (REST API, tanpa dependency tambahan).
// Tanpa RESEND_API_KEY, email dilewati dan dicatat di log (aman untuk pengembangan lokal).

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 5000;

let warned = false;

// Tidak pernah melempar error: kegagalan kirim dikembalikan sebagai hasil agar pemanggil (mis. register) tetap lanjut.
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (!warned) {
      warned = true;
      console.warn('[email] RESEND_API_KEY belum diset: email tidak dikirim (dilewati).');
    }
    return { ok: false, skipped: true };
  }

  const from = process.env.EMAIL_FROM || 'FinancePro <no-reply@grexion.ai>';
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // Isi respons Resend hanya berisi pesan error teknis (tanpa data kita); aman dicatat, tanpa isi email.
      const detail = await res.text().catch(() => '');
      console.error(`[email] Resend menolak (HTTP ${res.status}): ${detail.slice(0, 300)}`);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error('[email] gagal mengirim:', reason);
    return { ok: false, error: reason };
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}
