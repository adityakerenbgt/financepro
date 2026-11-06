'use client';

import { MessageCircle } from 'lucide-react';
import { useAuth } from '../auth-context';
import { useLang } from '../i18n';
import { PAYMENT_PLANS, formatRupiah, type PaymentPlanKey } from '@/lib/plans';
import { whatsappUrl } from '@/lib/whatsapp';

// Membuka WhatsApp admin dengan pesan terisi (username + paket). Info rekening diberikan admin lewat chat,
// jadi tidak ada data rekening di aplikasi. Tanpa nomor yang dikonfigurasi, jatuh kembali ke email.
export default function WhatsAppPayButton({ plan, variant = 'primary' }: { plan?: PaymentPlanKey; variant?: 'primary' | 'link' }) {
  const { t } = useLang();
  const { username } = useAuth();

  const who = username ? `@${username}` : '';
  const planText = plan
    ? `${plan === 'PRO_YEARLY' ? 'PRO Tahunan' : 'PRO Bulanan'} (${formatRupiah(PAYMENT_PLANS[plan].amount)})`
    : 'PRO';
  const message = `Halo admin FinancePro, saya ${who} ingin upgrade ke ${planText}. Mohon info pembayarannya.`.replace('saya  ', 'saya ');
  const href = whatsappUrl(message) ?? `mailto:hello@grexion.ai?subject=${encodeURIComponent('Upgrade FinancePro PRO')}&body=${encodeURIComponent(message)}`;
  const viaWa = href.startsWith('https://wa.me/');

  if (variant === 'link') {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline font-medium">
        {viaWa ? t('Chat admin via WhatsApp', 'Chat with admin on WhatsApp') : t('Hubungi admin via email', 'Contact admin by email')}
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full text-center bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-green-600/20"
    >
      <MessageCircle className="w-4 h-4" />
      {viaWa ? t('Bayar via WhatsApp', 'Pay via WhatsApp') : t('Hubungi admin untuk bayar', 'Contact admin to pay')}
    </a>
  );
}
