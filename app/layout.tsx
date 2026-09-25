import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import 'flag-icons/css/flag-icons.min.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gestión Hotelera',
  description: 'Tablero de indicadores, forecast, disponibilidades y simulador de gestión hotelera',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Arimo: métricas de Helvetica/Arial para equipos que no tienen Helvetica */}
        <link href="https://fonts.googleapis.com/css2?family=Arimo:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        <Nav />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  )
}
