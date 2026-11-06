import { appBaseUrl, escapeHtml, type EmailMessage } from '../../email';

// Email reset password. Memuat tautan sekali pakai (berlaku 1 jam); tidak pernah memuat password.
export function resetPasswordEmail(opts: { to: string; name: string; token: string; lang: 'id' | 'en' }): EmailMessage {
  const en = opts.lang === 'en';
  const t = (id: string, eng: string) => (en ? eng : id);
  const url = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(opts.token)}`;

  const subject = t('Atur ulang password FinancePro', 'Reset your FinancePro password');
  const greeting = t(`Halo ${opts.name},`, `Hi ${opts.name},`);
  const intro = t(
    'Kami menerima permintaan untuk mengatur ulang password akun FinancePro kamu. Klik tombol di bawah untuk membuat password baru.',
    'We received a request to reset the password of your FinancePro account. Click the button below to choose a new password.',
  );
  const cta = t('Atur Ulang Password', 'Reset Password');
  const expiry = t('Tautan ini berlaku 1 jam dan hanya bisa dipakai satu kali.', 'This link is valid for 1 hour and can be used only once.');
  const ignore = t(
    'Jika kamu tidak meminta ini, abaikan email ini; password kamu tidak akan berubah.',
    'If you did not request this, you can ignore this email; your password will not change.',
  );

  const html = `<!doctype html>
<html lang="${opts.lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#2563eb;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold;">FinancePro</td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 12px;font-size:20px;">${escapeHtml(greeting)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${escapeHtml(intro)}</p>
          <a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:8px;">${escapeHtml(cta)}</a>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#475569;">${escapeHtml(expiry)}</p>
          <p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:#475569;word-break:break-all;">${escapeHtml(t('Jika tombol tidak berfungsi, salin tautan ini ke browser:', 'If the button does not work, copy this link into your browser:'))}<br>${escapeHtml(url)}</p>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;font-size:12px;color:#64748b;line-height:1.5;">${escapeHtml(ignore)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [greeting, '', intro, '', `${cta}: ${url}`, '', expiry, ignore].join('\n');
  return { to: opts.to, subject, html, text };
}
