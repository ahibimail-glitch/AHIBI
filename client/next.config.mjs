/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Remove console statements in production builds (keep error and warn)
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },
}

export default nextConfig
