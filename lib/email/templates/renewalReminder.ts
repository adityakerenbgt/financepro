import { appBaseUrl, escapeHtml, type EmailMessage } from '../../email';
import { emailButton, emailShell } from '../layout';

// Pengingat masa aktif PRO. kind 'trial' = trial gratis akan berakhir; 'paid' = langganan berbayar akan berakhir.
// Tidak pernah memuat password. Bahasa Indonesia (bahasa pilihan user belum disimpan).
export function renewalReminderEmail(opts: {
  to: string; name: string; kind: 'trial' | 'paid'; expiresAt: Date; daysLeft: number;
}): EmailMessage {
  const date = opts.expiresAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const sisa = opts.daysLeft <= 1 ? 'kurang dari 1 hari lagi' : `${opts.daysLeft} hari lagi`;
  const url = `${appBaseUrl()}/dashboard/upgrade`;
  const greeting = `Halo ${opts.name},`;
  const footer = 'Kamu menerima email ini karena memakai FinancePro PRO. Ada pertanyaan? Balas lewat hello@grexion.ai.';

  let subject: string, lead: string, consequence: string, cta: string;
  if (opts.kind === 'trial') {
    subject = 'Trial PRO kamu segera berakhir';
    lead = `Masa trial PRO kamu berakhir pada ${date} (${sisa}).`;
    consequence = 'Setelah itu akunmu kembali ke paket FREE: data tetap aman, tetapi fitur PRO (laporan lengkap, nabung & investasi, hutang, aset, budget, goals) dan rekening tambahan tidak bisa dipakai. Upgrade sekarang agar tidak terputus.';
    cta = 'Upgrade ke PRO';
  } else {
    subject = 'PRO kamu segera berakhir, perpanjang sekarang';
    lead = `Langganan PRO kamu berakhir pada ${date} (${sisa}).`;
    consequence = 'Perpanjang sebelum masa aktif habis; sisa hari yang ada tidak hilang dan akan ditambahkan ke periode berikutnya.';
    cta = 'Perpanjang PRO';
  }

  const html = emailShell(subject, `
          <h1 style="margin:0 0 12px;font-size:20px;">${escapeHtml(greeting)}</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;font-weight:bold;">${escapeHtml(lead)}</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${escapeHtml(consequence)}</p>
          ${emailButton(url, cta)}`, footer);
  const text = [greeting, '', lead, consequence, '', `${cta}: ${url}`, '', footer].join('\n');
  return { to: opts.to, subject, html, text };
}
