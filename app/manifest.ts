import type { MetadataRoute } from 'next'

// Permite instalar la web como app (computadora y celular)
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Gestión Hotelera · LTELC BI',
    short_name: 'Hoteles LTELC',
    description: 'Indicadores diarios, forecast, disponibilidades y simulador de gestión hotelera. Hecho por LTELC BI.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#1c1c1c',
    theme_color: '#1c1c1c',
    lang: 'es-AR',
    icons: [
      { src: '/iconos/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/iconos/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/iconos/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
