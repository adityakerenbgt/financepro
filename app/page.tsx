import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import LandingContent from './components/landing/LandingContent';

export function generateMetadata(): Metadata {
  const en = cookies().get('fp-lang')?.value === 'en';

  if (en) {
    return {
      title: 'FinancePro — Personal Finance Manager for Indonesia',
      description:
        'Track transactions, monitor debts & investments, set budgets, and reach your savings goals in one dashboard. Indonesian or English. Start free.',
      openGraph: {
        title: 'FinancePro — Know where your money goes',
        description:
          'One place for transactions, accounts, debts, investments, budgets, and goals. Start free, upgrade to PRO from Rp29,000/month.',
        type: 'website',
        locale: 'en_US',
        siteName: 'FinancePro',
      },
    };
  }

  return {
    title: 'FinancePro — Aplikasi Manajemen Keuangan Pribadi untuk Indonesia',
    description:
      'Catat transaksi, pantau utang & investasi, atur budget, dan capai target tabungan dalam satu dashboard berbahasa Indonesia. Mulai gratis.',
    openGraph: {
      title: 'FinancePro — Tahu ke mana uangmu pergi',
      description:
        'Satu tempat untuk transaksi, rekening, utang, investasi, budget, dan goals. Mulai gratis, upgrade PRO mulai Rp29.000/bulan.',
      type: 'website',
      locale: 'id_ID',
      siteName: 'FinancePro',
    },
  };
}

export default function HomePage() {
  return <LandingContent />;
}
