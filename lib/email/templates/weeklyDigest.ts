import { appBaseUrl, escapeHtml, type EmailMessage } from '../../email';
import { formatRupiah } from '../../plans';
import { emailButton, emailShell } from '../layout';

export interface DigestData {
  periodLabel: string; // mis. "2 Nov – 8 Nov 2026"
  totalExpense: number;
  prevExpense: number;
  totalIncome: number;
  topCategories: { category: string; amount: number; changeLabel: string }[];
  budgetAlerts: { category: string; percentage: number; status: string }[];
}

// Kalimat perbandingan pengeluaran minggu ini vs minggu sebelumnya.
export function compareText(total: number, prev: number): string {
  if (prev === 0 && total === 0) return 'Tidak ada pengeluaran di dua pekan ini.';
  if (prev === 0) return 'Minggu sebelumnya tidak ada pengeluaran.';
  const pct = Math.round((Math.abs(total - prev) / prev) * 100);
  if (total > prev) return `Naik ${pct}% dibanding minggu sebelumnya (${formatRupiah(prev)}).`;
  if (total < prev) return `Turun ${pct}% dibanding minggu sebelumnya (${formatRupiah(prev)}).`;
  return `Sama dengan minggu sebelumnya (${formatRupiah(prev)}).`;
}

// Email ringkasan mingguan. Berisi tautan berhenti berlangganan (wajib) dan header List-Unsubscribe (satu klik).
export function weeklyDigestEmail(opts: { to: string; name: string; data: DigestData; unsubscribeUrl: string }): EmailMessage {
  const { data } = opts;
  const subject = `Ringkasan keuangan mingguan (${data.periodLabel})`;
  const greeting = `Halo ${opts.name},`;
  const intro = `Ini ringkasan keuanganmu untuk ${data.periodLabel}.`;
  const compare = compareText(data.totalExpense, data.prevExpense);
  const dashboardUrl = `${appBaseUrl()}/dashboard`;
  const settingsUrl = `${appBaseUrl()}/dashboard/settings`;
  const footer = 'Kamu menerima ringkasan ini karena mengaktifkan email mingguan FinancePro. Berhenti berlangganan kapan saja lewat tautan di bawah atau di Pengaturan.';

  const catRows = data.topCategories
    .map(c => `<tr><td style="padding:6px 0;font-size:14px;">${escapeHtml(c.category)}</td><td style="padding:6px 0;font-size:14px;text-align:right;"><strong>${escapeHtml(formatRupiah(c.amount))}</strong> <span style="color:#64748b;">· ${escapeHtml(c.changeLabel)}</span></td></tr>`)
    .join('');
  const budgetRows = data.budgetAlerts
    .map(b => `<li style="margin:4px 0;">${escapeHtml(b.category)}: ${escapeHtml(String(Math.round(b.percentage)))}% (${escapeHtml(b.status)})</li>`)
    .join('');

  const html = emailShell(subject, `
          <h1 style="margin:0 0 8px;font-size:20px;">${escapeHtml(greeting)}</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;">${escapeHtml(intro)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
            <tr>
              <td style="padding:12px;background:#f8fafc;border-radius:8px;width:50%;"><div style="font-size:12px;color:#64748b;">Pengeluaran</div><div style="font-size:20px;font-weight:bold;">${escapeHtml(formatRupiah(data.totalExpense))}</div></td>
              <td style="width:8px;"></td>
              <td style="padding:12px;background:#f8fafc;border-radius:8px;width:50%;"><div style="font-size:12px;color:#64748b;">Pemasukan</div><div style="font-size:20px;font-weight:bold;">${escapeHtml(formatRupiah(data.totalIncome))}</div></td>
            </tr>
          </table>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">${escapeHtml(compare)}</p>
          ${catRows ? `<h2 style="margin:0 0 4px;font-size:15px;">Kategori pengeluaran teratas</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${catRows}</table>` : ''}
          ${budgetRows ? `<h2 style="margin:0 0 4px;font-size:15px;color:#b45309;">Perhatian budget bulan ini</h2><ul style="margin:0 0 16px;padding-left:20px;font-size:14px;">${budgetRows}</ul>` : ''}
          ${emailButton(dashboardUrl, 'Buka Dashboard')}
          <p style="margin:20px 0 0;font-size:12px;color:#64748b;"><a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#64748b;">Berhenti berlangganan</a> · <a href="${settingsUrl}" style="color:#64748b;">Pengaturan</a></p>`, footer);

  const text = [
    greeting, '', intro, '',
    `Pengeluaran: ${formatRupiah(data.totalExpense)}`,
    `Pemasukan: ${formatRupiah(data.totalIncome)}`,
    compare,
    ...(data.topCategories.length ? ['', 'Kategori pengeluaran teratas:', ...data.topCategories.map(c => `- ${c.category}: ${formatRupiah(c.amount)} (${c.changeLabel})`)] : []),
    ...(data.budgetAlerts.length ? ['', 'Perhatian budget bulan ini:', ...data.budgetAlerts.map(b => `- ${b.category}: ${Math.round(b.percentage)}% (${b.status})`)] : []),
    '', `Buka Dashboard: ${dashboardUrl}`, '', footer, `Berhenti berlangganan: ${opts.unsubscribeUrl}`,
  ].join('\n');

  return {
    to: opts.to, subject, html, text,
    headers: {
      'List-Unsubscribe': `<${opts.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}
