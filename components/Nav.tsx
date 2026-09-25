'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', texto: 'Resumen' },
  { href: '/flash', texto: 'Manager Flash' },
  { href: '/hf', texto: 'H&F' },
  { href: '/tablero', texto: 'Tablero' },
  { href: '/pickup', texto: 'Pick up' },
  { href: '/paises', texto: 'Por país' },
  { href: '/disponibilidades', texto: 'Disponibilidades' },
  { href: '/proyecciones', texto: 'Proyecciones' },
  { href: '/simulador', texto: 'Simulador' },
  { href: '/datos', texto: 'Datos' },
]

export default function Nav() {
  const ruta = usePathname()
  return (
    <header className="no-imprimir sticky top-0 z-20 bg-marca text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-x-8 px-4 sm:px-6 lg:flex-row lg:items-center">
        <Link href="/" className="shrink-0 pt-3 text-lg font-bold tracking-tight lg:py-4">
          Gestión Hotelera
        </Link>
        <nav className="-mx-3 flex overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none]">
          {LINKS.map((l) => {
            const activo = l.href === '/' ? ruta === '/' : ruta.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 border-b-2 px-3 py-3 transition-colors lg:py-4 ${
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
