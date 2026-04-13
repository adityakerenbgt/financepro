import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'FinancePro — Personal Finance Manager',
  description: 'Kelola keuangan pribadi: transaksi, investasi, utang, budget, dan goals.',
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0f172a' },
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinancePro',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
