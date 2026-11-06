import { escapeHtml } from '../email';

// Kerangka HTML email bersama (satu kolom, maks. 600px, gaya inline agar aman di klien email & ponsel).
export function emailShell(title: string, bodyHtml: string, footer: string, lang: 'id' | 'en' = 'id'): string {
  return `<!doctype html>
<html lang="${lang}">
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

export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:8px;">${escapeHtml(label)}</a>`;
}
