/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Catatan: tidak ada header CORS "*" pada /api. Aplikasi memakai API pada origin yang sama; webhook Telegram dan cron
  // adalah panggilan server-ke-server yang tidak membutuhkan CORS.
};

module.exports = nextConfig;
