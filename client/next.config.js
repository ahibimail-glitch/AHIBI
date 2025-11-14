// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['placehold.co', 'res.cloudinary.com', 'images.unsplash.com', 'ld9yt1pcwrcddoux.public.blob.vercel-storage.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ]
  },
  async redirects() {
    return [
      // Redirect www to root domain
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.ahibi.in',
          },
        ],
        destination: 'https://ahibi.in/:path*',
        permanent: true,
      },
    ]
  },
  // Remove console statements in production builds (keep error and warn)
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },
}

module.exports = nextConfig
