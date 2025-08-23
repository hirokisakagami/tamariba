/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['stream.cloudflare.com'],
    unoptimized: true,
  },
  // For Netlify deployment
  trailingSlash: true,
}

module.exports = nextConfig