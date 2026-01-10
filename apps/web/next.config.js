/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  // ESLint - don't fail on warnings during build
  eslint: {
    ignoreDuringBuilds: false,
    // Directories to lint
    dirs: ['src'],
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Response headers for caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: apiUrl + '/api/:path*',
      },
    ];
  },

  assetPrefix: process.env.ASSET_PREFIX || '',

  // Experimental optimizations
  experimental: {
    optimizePackageImports: ['@radix-ui/*', 'lucide-react'],
  },
};

module.exports = nextConfig;
