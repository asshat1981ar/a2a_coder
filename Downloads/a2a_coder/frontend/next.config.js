/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://orchestrator:3001/api/:path*'
      }
    ];
  }
};

module.exports = nextConfig;