/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow long-running API routes for Telegram webhook processing
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Ensure API routes have enough time for Google Sheets operations
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
