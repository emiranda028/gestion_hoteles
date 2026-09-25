'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', texto: 'Tablero' },
  { href: '/pickup', texto: 'Forecast y pick up' },
  { href: '/disponibilidades', texto: 'Disponibilidades' },
  { href: '/proyecciones', texto: 'Proyecciones' },
  { href: '/simulador', texto: 'Simulador' },
  { href: '/datos', texto: 'Datos' },
]

export default function Nav() {
  const ruta = usePathname()
  return (
    <header className="no-imprimir sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight text-marca">
          Gestión Hotelera
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {LINKS.map((l) => {
            const activo = l.href === '/' ? ruta === '/' : ruta.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 ${activo ? 'bg-marca text-white' : 'text-slate-600 hover:bg-slate-100'}`}
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
