import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Los CSV de data/ se leen en el servidor; se incluyen explícitamente en el bundle.
  outputFileTracingIncludes: { '/**': ['./data/**/*'] },
}

export default nextConfig
