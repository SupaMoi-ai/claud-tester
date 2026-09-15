import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Financial data must never be served from a stale cache. See CLAUDE.md:
  // routes under src/app/(app)/ are dynamic and `use cache` is banned there.
  typedRoutes: true,
  experimental: {
    // postgres.js is a server-only driver; keep it out of any client bundle.
    serverActions: { bodySizeLimit: '8mb' },
  },
  serverExternalPackages: ['postgres'],
}

export default nextConfig
