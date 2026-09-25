import type { Metadata, Viewport } from 'next'
import { FirmaLtelc } from '@/components/LogoLtelc'
import Nav from '@/components/Nav'
import { usuarioActual } from '@/lib/usuarios'
import '@fontsource/sora/600.css'
import '@fontsource/sora/800.css'
import 'flag-icons/css/flag-icons.min.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gestión Hotelera · LTELC BI',
  description: 'Tablero de indicadores, forecast, disponibilidades y simulador de gestión hotelera. Hecho por LTELC BI.',
  applicationName: 'Hoteles LTELC',
  appleWebApp: { capable: true, title: 'Hoteles LTELC', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#1c1c1c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const u = await usuarioActual()
  const verPaises = !!u && (u.grupos.includes('*') || u.grupos.includes('panatel'))
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Arimo: métricas de Helvetica/Arial para equipos que no tienen Helvetica */}
        <link href="https://fonts.googleapis.com/css2?family=Arimo:wght@400;500;600;700&family=Montserrat:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <Nav usuario={u ? { nombre: u.nombre, admin: u.rol === 'admin' } : null} verPaises={verPaises} />
        {u ? (
          <>
            <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-8">{children}</main>
            <footer className="no-imprimir border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-neutral-500 sm:px-6">
                <span>Gestión Hotelera</span>
                <FirmaLtelc />
              </div>
            </footer>
          </>
        ) : (
          children /* portada del login: pantalla completa */
        )}
      </body>
    </html>
  )
}
