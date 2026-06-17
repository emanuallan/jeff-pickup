import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Avoid picking up the PoC lockfile at repo root
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
}

export default nextConfig
