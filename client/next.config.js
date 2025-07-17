// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://ahibi.onrender.com/api/:path*'
      }
    ]
  }
}