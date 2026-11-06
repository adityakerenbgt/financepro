import { appBaseUrl, escapeHtml, type EmailMessage } from '../../email';
import { PAYMENT_PLANS, formatRupiah, type PaymentPlanKey } from '../../plans';

// Email hasil peninjauan pembayaran (disetujui / ditolak). Alasan penolakan berasal dari admin, jadi selalu di-escape.
// Bahasa Indonesia: admin yang memproses tidak selalu memakai bahasa yang sama dengan user.

function shell(title: string, bodyHtml: string, footer: string): string {
  return `<!doctype html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#2563eb;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold;">FinancePro</td></tr>
        <tr><td style="padding:28px;">${bodyHtml}</td></tr>
        <tr><td style="padding:16px 28px 24px;font-size:12px;color:#64748b;line-height:1.5;">${escapeHtml(footer)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:8px;">${escapeHtml(label)}</a>`;

function planLabel(plan: PaymentPlanKey): string {
  return plan === 'PRO_YEARLY' ? 'PRO Tahunan' : 'PRO Bulanan';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

export function paymentApprovedEmail(opts: {
  to: string; name: string; plan: PaymentPlanKey; amount: number; planExpiresAt: Date | null;
}): EmailMessage {
  const subject = 'Pembayaran PRO kamu sudah dikonfirmasi';
  const greeting = `Halo ${opts.name},`;
  const detail = `Pembayaran ${planLabel(opts.plan)} sebesar ${formatRupiah(opts.amount)} sudah kami konfirmasi.`;
  const validity = opts.planExpiresAt
    ? `PRO aktif sampai ${formatDate(opts.planExpiresAt)}.`
    : 'PRO kamu aktif tanpa batas waktu.';
  const closing = 'Terima kasih sudah berlangganan FinancePro.';
  const url = `${appBaseUrl()}/dashboard`;
  const footer = 'Kamu menerima email ini karena mengajukan pembayaran di FinancePro. Ada pertanyaan? Balas lewat hello@grexion.ai.';

  const html = shell(subject, `
          <h1 style="margin:0 0 12px;font-size:20px;">${escapeHtml(greeting)}</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${escapeHtml(detail)}</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;font-weight:bold;">${escapeHtml(validity)}</p>
          ${button(url, 'Buka Dashboard')}
          <p style="margin:20px 0 0;font-size:13px;color:#475569;">${escapeHtml(closing)}</p>`, footer);
  const text = [greeting, '', detail, validity, '', `Buka Dashboard: ${url}`, '', closing, '', footer].join('\n');
  return { to: opts.to, subject, html, text };
}

export function paymentRejectedEmail(opts: {
  to: string; name: string; plan: PaymentPlanKey; amount: number; reason: string;
}): EmailMessage {
  const subject = 'Pembayaran kamu belum bisa dikonfirmasi';
  const greeting = `Halo ${opts.name},`;
  const detail = `Pembayaran ${planLabel(opts.plan)} sebesar ${formatRupiah(opts.amount)} belum bisa kami konfirmasi.`;
  const reasonLabel = 'Alasan:';
  const next = 'Kamu bisa mengajukan ulang dengan bukti transfer yang benar, atau hubungi admin bila ada yang kurang jelas.';
  const url = `${appBaseUrl()}/dashboard/upgrade#bayar`;
  const footer = 'Kamu menerima email ini karena mengajukan pembayaran di FinancePro. Ada pertanyaan? Balas lewat hello@grexion.ai.';

  const html = shell(subject, `
          <h1 style="margin:0 0 12px;font-size:20px;">${escapeHtml(greeting)}</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${escapeHtml(detail)}</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;"><strong>${escapeHtml(reasonLabel)}</strong> ${escapeHtml(opts.reason)}</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${escapeHtml(next)}</p>
          ${button(url, 'Ajukan Ulang')}`, footer);
  const text = [greeting, '', detail, `${reasonLabel} ${opts.reason}`, '', next, '', `Ajukan Ulang: ${url}`, '', footer].join('\n');
  return { to: opts.to, subject, html, text };
}

// Dipakai untuk memastikan paket valid sebelum membuat email (nominal tidak dipercaya dari luar).
export function isPaymentPlan(p: string): p is PaymentPlanKey {
  return p in PAYMENT_PLANS;
}
