/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    const dev = process.env.NODE_ENV !== 'production';
    // CSP: skrip inline dipertahankan ('unsafe-inline') karena Next.js menyisipkan skrip inline; tanpa nonce per request.
    // Sumber lain dibatasi ketat. Supabase = tautan bukti pembayaran bertanda tangan; Sentry = pelaporan error (bila aktif).
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co",
      `connect-src 'self' https://*.supabase.co https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io${dev ? ' ws: http://localhost:*' : ''}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    }];
  },
  // Catatan: tidak ada header CORS "*" pada /api. Aplikasi memakai API pada origin yang sama; webhook Telegram dan cron
  // adalah panggilan server-ke-server yang tidak membutuhkan CORS.
};

// Sentry hanya dibungkus bila DSN diisi, supaya build tanpa Sentry tetap persis seperti sebelumnya.
// Upload source map hanya berjalan bila SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT diisi (di Vercel, bukan di repo).
const sentryOn = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
module.exports = sentryOn
  ? require('@sentry/nextjs').withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;
