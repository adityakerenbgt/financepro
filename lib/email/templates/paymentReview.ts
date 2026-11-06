import { appBaseUrl, escapeHtml, type EmailMessage } from '../../email';
import { PAYMENT_PLANS, formatRupiah, type PaymentPlanKey } from '../../plans';
import { emailButton, emailShell } from '../layout';

// Email hasil peninjauan pembayaran (disetujui / ditolak). Alasan penolakan berasal dari admin, jadi selalu di-escape.
// Bahasa Indonesia: admin yang memproses tidak selalu memakai bahasa yang sama dengan user.

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

  const html = emailShell(subject, `
          <h1 style="margin:0 0 12px;font-size:20px;">${escapeHtml(greeting)}</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${escapeHtml(detail)}</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;font-weight:bold;">${escapeHtml(validity)}</p>
          ${emailButton(url, 'Buka Dashboard')}
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

  const html = emailShell(subject, `
          <h1 style="margin:0 0 12px;font-size:20px;">${escapeHtml(greeting)}</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${escapeHtml(detail)}</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;"><strong>${escapeHtml(reasonLabel)}</strong> ${escapeHtml(opts.reason)}</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${escapeHtml(next)}</p>
          ${emailButton(url, 'Ajukan Ulang')}`, footer);
  const text = [greeting, '', detail, `${reasonLabel} ${opts.reason}`, '', next, '', `Ajukan Ulang: ${url}`, '', footer].join('\n');
  return { to: opts.to, subject, html, text };
}

// Dipakai untuk memastikan paket valid sebelum membuat email (nominal tidak dipercaya dari luar).
export function isPaymentPlan(p: string): p is PaymentPlanKey {
  return p in PAYMENT_PLANS;
}
