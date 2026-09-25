'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cerrarSesion } from '@/app/acciones'

const LINKS = [
  { href: '/', texto: 'Resumen' },
  { href: '/flash', texto: 'Manager Flash' },
  { href: '/hf', texto: 'H&F' },
  { href: '/tablero', texto: 'Tablero' },
  { href: '/pickup', texto: 'Pick up' },
  { href: '/paises', texto: 'Por país', paises: true },
  { href: '/disponibilidades', texto: 'Disponibilidades' },
  { href: '/proyecciones', texto: 'Proyecciones' },
  { href: '/simulador', texto: 'Simulador' },
]
const ADMIN = [
  { href: '/datos', texto: 'Datos' },
  { href: '/admin/usuarios', texto: 'Usuarios' },
]

export default function Nav({ usuario, verPaises }: { usuario: { nombre: string; admin: boolean } | null; verPaises: boolean }) {
  const ruta = usePathname()
  if (!usuario) {
    return <header className="no-imprimir h-2 bg-marca" />
  }
  const links = LINKS.filter((l) => !l.paises || verPaises)
  const cuenta = (
    <>
      {usuario.admin && ADMIN.map((l) => (
        <Link key={l.href} href={l.href} className={ruta.startsWith(l.href) ? 'font-semibold text-white underline decoration-acento decoration-2 underline-offset-4' : 'hover:text-white'}>
          {l.texto}
        </Link>
      ))}
      <Link href="/cuenta" className={`max-w-32 truncate ${ruta === '/cuenta' ? 'text-white' : 'hover:text-white'}`}>{usuario.nombre}</Link>
      <button type="submit" className="rounded-full border border-neutral-500 px-2.5 py-0.5 hover:border-white hover:text-white">Salir</button>
    </>
  )
  return (
    <header className="no-imprimir sticky top-0 z-20 bg-marca text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-x-6 px-4 sm:px-6 lg:flex-row lg:items-center">
        <div className="flex items-center justify-between gap-4 pt-3 lg:py-4">
          <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">Gestión Hotelera</Link>
          <form action={cerrarSesion} className="text-xs text-neutral-300 lg:hidden">
            <button type="submit" className="rounded-full border border-neutral-500 px-2.5 py-0.5 hover:border-white hover:text-white">Salir</button>
          </form>
        </div>
        <nav className="-mx-3 flex flex-1 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none]">
          {links.map((l) => {
            const activo = l.href === '/' ? ruta === '/' : ruta.startsWith(l.href)
            return (
              <Link key={l.href} href={l.href}
                className={`shrink-0 border-b-2 px-3 py-3 transition-colors lg:px-2.5 lg:py-4 ${
                  activo ? 'border-acento font-semibold text-white' : 'border-transparent text-neutral-300 hover:text-white'
                }`}>
                {l.texto}
              </Link>
            )
          })}
          {[...(usuario.admin ? ADMIN : []), { href: '/cuenta', texto: 'Mi cuenta' }].map((l) => (
            <Link key={l.href} href={l.href}
              className={`shrink-0 border-b-2 px-3 py-3 lg:hidden ${ruta.startsWith(l.href) ? 'border-acento font-semibold text-white' : 'border-transparent text-neutral-400'}`}>
              {l.texto}
            </Link>
          ))}
        </nav>
        <form action={cerrarSesion} className="hidden shrink-0 items-center gap-3 text-xs text-neutral-300 lg:flex">{cuenta}</form>
      </div>
    </header>
  )
}
