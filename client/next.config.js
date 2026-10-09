// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['placehold.co', 'res.cloudinary.com', 'images.unsplash.com', 'ld9yt1pcwrcddoux.public.blob.vercel-storage.com', 'drive.google.com', 'lh3.googleusercontent.com', 'img.youtube.com', 'vumbnail.com'],
  },
  async headers() {
    return [
      {
        source: '/livestream/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'display-capture=()' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        ],
      },
    ]
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000'
    return [
      {
        // Keep /api/upload on Next.js (Vercel Blob). Do not proxy to backend Cloudinary.
        source: '/api/:path((?!upload(?:/|$)).*)',
        destination: `${apiBase}/api/:path*`,
      },
    ]
  },
  async redirects() {
    return [
      // Domain redirects (www ↔ apex) belong in Vercel/hosting settings only.
      // Do not add them here — duplicate rules cause ERR_TOO_MANY_REDIRECTS.
      // Sports section disabled — routes kept in codebase for future use
      {
        source: '/sports',
        destination: '/',
        permanent: false,
      },
      {
        source: '/sports/:path*',
        destination: '/',
        permanent: false,
      },
    ]
  },
  // Remove console statements in production builds (keep error and warn)
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },
}

module.exports = nextConfig
