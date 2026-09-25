import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Los CSV de data/ se leen en el servidor; se incluyen explícitamente en el bundle.
  outputFileTracingIncludes: { '/**': ['./data/**/*'] },
  // fotos de la portada (se achican en el servidor)
  experimental: { serverActions: { bodySizeLimit: '16mb' }, proxyClientMaxBodySize: '16mb' },
}

export default nextConfig
