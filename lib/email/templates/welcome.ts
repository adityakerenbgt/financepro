import { appBaseUrl, escapeHtml, type EmailMessage } from '../../email';

// Email selamat datang. Tidak pernah memuat password. Layout satu kolom (max 600px) agar terbaca baik di ponsel.
export function welcomeEmail(opts: { to: string; name: string; lang: 'id' | 'en' }): EmailMessage {
  const en = opts.lang === 'en';
  const t = (id: string, eng: string) => (en ? eng : id);
  const name = escapeHtml(opts.name);
  const dashboardUrl = `${appBaseUrl()}/dashboard`;

  const subject = t('Selamat datang di FinancePro', 'Welcome to FinancePro');
  const greeting = t(`Halo ${opts.name},`, `Hi ${opts.name},`);
  const intro = t(
    'Akun FinancePro kamu sudah aktif. Mulai catat keuanganmu dengan tiga langkah singkat:',
    'Your FinancePro account is ready. Start tracking your money in three quick steps:',
  );
  const steps = [
    t('Buat rekening pertama (mis. BCA, dompet, atau e-wallet).', 'Create your first account (e.g. bank, wallet or e-wallet).'),
    t('Catat transaksi pertamamu.', 'Record your first transaction.'),
    t('Atur target tabungan dan pengeluaran di Pengaturan.', 'Set your savings and spending targets in Settings.'),
  ];
  const cta = t('Buka Dashboard', 'Open Dashboard');
  const footer = t(
    'Kamu menerima email ini karena mendaftar di FinancePro. Jika itu bukan kamu, abaikan saja email ini.',
    'You received this email because you signed up for FinancePro. If this was not you, you can ignore it.',
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
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(intro)}</p>
          <ol style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.7;">
            ${steps.map(s => `<li>${escapeHtml(s)}</li>`).join('\n            ')}
          </ol>
          <a href="${dashboardUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:8px;">${escapeHtml(cta)}</a>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;font-size:12px;color:#64748b;line-height:1.5;">${escapeHtml(footer)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [greeting, '', intro, ...steps.map((s, i) => `${i + 1}. ${s}`), '', `${cta}: ${dashboardUrl}`, '', footer].join('\n');

  return { to: opts.to, subject, html, text };
}
