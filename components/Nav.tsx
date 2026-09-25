'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', texto: 'Resumen' },
  { href: '/tablero', texto: 'Tablero' },
  { href: '/pickup', texto: 'Forecast y pick up' },
  { href: '/disponibilidades', texto: 'Disponibilidades' },
  { href: '/proyecciones', texto: 'Proyecciones' },
  { href: '/simulador', texto: 'Simulador' },
  { href: '/datos', texto: 'Datos' },
]

export default function Nav() {
  const ruta = usePathname()
  return (
    <header className="no-imprimir sticky top-0 z-20 bg-marca text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-1 px-4 sm:px-6">
        <Link href="/" className="py-4 text-lg font-bold tracking-tight">
          Gestión Hotelera
        </Link>
        <nav className="flex flex-wrap text-sm">
          {LINKS.map((l) => {
            const activo = l.href === '/' ? ruta === '/' : ruta.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`border-b-2 px-3 py-4 transition-colors ${
                  activo ? 'border-acento font-semibold text-white' : 'border-transparent text-neutral-300 hover:text-white'
                }`}
              >
                {l.texto}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
