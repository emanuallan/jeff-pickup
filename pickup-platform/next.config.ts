import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Avoid picking up the PoC lockfile at repo root
  outputFileTracingRoot: path.join(__dirname),
  // TODO: add image domains when org logo uploads are implemented
}

export default nextConfig
