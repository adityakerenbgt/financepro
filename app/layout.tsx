import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cookies } from 'next/headers';
import { Providers } from './providers';
import { DEFAULT_CURRENCY, isSupportedCurrency } from '@/lib/currency';

export const metadata: Metadata = {
  title: 'FinancePro — Personal Finance Manager',
  description: 'Kelola keuangan pribadi: transaksi, investasi, utang, budget, dan goals.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinancePro',
  },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0f172a' },
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = cookies();
  const lang = jar.get('fp-lang')?.value === 'en' ? 'en' : 'id';
  const cur = jar.get('fp-currency')?.value;
  const currency = isSupportedCurrency(cur) ? cur : DEFAULT_CURRENCY;

  return (
    <html lang={lang} className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <Providers initialLang={lang} initialCurrency={currency}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
