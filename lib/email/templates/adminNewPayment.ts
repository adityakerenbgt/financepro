import { appBaseUrl, escapeHtml, type EmailMessage } from '../../email';
import { formatRupiah, type PaymentPlanKey } from '../../plans';
import { emailButton, emailShell } from '../layout';

// Email ke admin saat ada permintaan pembayaran baru. Tidak ada tautan yang menyetujui langsung:
// tombolnya hanya membuka panel admin (wajib login). Semua data user di-escape.
export function adminNewPaymentEmail(opts: {
  to: string; username: string; email: string | null; plan: PaymentPlanKey; amount: number; userNote: string | null; createdAt: Date;
}): EmailMessage {
  const planLabel = opts.plan === 'PRO_YEARLY' ? 'PRO Tahunan' : 'PRO Bulanan';
  const when = opts.createdAt.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB';
  const subject = `Pembayaran baru: ${opts.username} — ${planLabel}`;
  const url = `${appBaseUrl()}/dashboard/admin`;
  const rows: [string, string][] = [
    ['User', opts.username], ['Email', opts.email ?? '-'], ['Paket', planLabel],
    ['Nominal', formatRupiah(opts.amount)], ['Waktu', when], ['Catatan user', opts.userNote || '-'],
  ];
  const footer = 'Setujui atau tolak lewat panel admin (perlu login). Email ini tidak berisi tautan persetujuan langsung.';
  const html = emailShell(subject, `
          <h1 style="margin:0 0 12px;font-size:20px;">Permintaan pembayaran baru</h1>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:15px;line-height:1.6;">
            ${rows.map(([k, v]) => `<tr><td style="padding:2px 16px 2px 0;color:#475569;">${escapeHtml(k)}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}
          </table>
          ${emailButton(url, 'Buka Panel Admin')}`, footer);
  const text = ['Permintaan pembayaran baru', '', ...rows.map(([k, v]) => `${k}: ${v}`), '', `Panel admin: ${url}`, '', footer].join('\n');
  return { to: opts.to, subject, html, text };
}
