// next.config.js
module.exports = {
  images: {
    domains: ['placehold.co', 'res.cloudinary.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
      }
    ]
  },
  async redirects() {
    return [
      // Force HTTPS
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: '(?i)^ahibi\\.in$', // match domain case-insensitively
          },
        ],
        destination: 'https://ahibi.in/:path*',
        permanent: true,
      },
      // Redirect www to root
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: '(?i)^www\\.ahibi\\.in$',
          },
