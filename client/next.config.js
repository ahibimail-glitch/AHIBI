// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://ahibi-backend.onrender.com/api/:path*'
      }
    ]
  }
}