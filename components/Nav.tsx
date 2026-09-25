'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { cerrarSesion } from '@/app/acciones'
import { IconoInstalar, useInstalarApp } from './InstalarApp'
import { IconoLtelc } from './LogoLtelc'

type Enlace = { href: string; texto: string; paises?: boolean }

// Como en Power BI: primero los resúmenes y reportes diarios, después el análisis
const PRINCIPALES: Enlace[] = [
  { href: '/', texto: 'Resumen' },
  { href: '/hotel', texto: 'Hotel' },
  { href: '/flash', texto: 'Manager Flash' },
  { href: '/hf', texto: 'H&F' },
  { href: '/comparativa', texto: 'Comparativa' },
  { href: '/pickup', texto: 'Pick up' },
  { href: '/paises', texto: 'Por país', paises: true },
  { href: '/disponibilidades', texto: 'Disponibilidades' },
]
const ANALISIS: Enlace[] = [
  { href: '/tablero', texto: 'Tablero' },
  { href: '/proyecciones', texto: 'Proyecciones' },
  { href: '/simulador', texto: 'Simulador' },
]
const ADMIN: Enlace[] = [
  { href: '/datos', texto: 'Datos' },
  { href: '/admin/usuarios', texto: 'Usuarios' },
]

const esActivo = (ruta: string, href: string) => (href === '/' ? ruta === '/' : ruta.startsWith(href))

/** Menú desplegable que se cierra al hacer clic afuera o al navegar. */
function Desplegable({ boton, children, derecha = false }: { boton: React.ReactNode; children: React.ReactNode; derecha?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const ruta = usePathname()
  useEffect(() => { if (ref.current) ref.current.open = false }, [ruta])
  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false
    }
    document.addEventListener('click', cerrar)
    return () => document.removeEventListener('click', cerrar)
  }, [])
  return (
    <details ref={ref} className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
        {boton}
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" fill="currentColor" aria-hidden="true">
          <path d="M5 7l5 6 5-6z" />
        </svg>
      </summary>
      <div className={`absolute top-full z-30 mt-2 min-w-48 overflow-hidden rounded-xl bg-white py-1.5 text-sm text-neutral-900 shadow-xl ring-1 ring-black/5 ${derecha ? 'right-0' : 'left-0'}`}>
        {children}
      </div>
    </details>
  )
}

function ItemMenu({ href, texto, activo }: { href: string; texto: string; activo: boolean }) {
  return (
    <Link href={href} className={`block px-4 py-2 hover:bg-neutral-100 ${activo ? 'font-semibold text-acento' : ''}`}>{texto}</Link>
  )
}

export default function Nav({ usuario, verPaises }: { usuario: { nombre: string; admin: boolean } | null; verPaises: boolean }) {
  const ruta = usePathname()
  const instalar = useInstalarApp()
  const [abierto, setAbierto] = useState(false)
  useEffect(() => setAbierto(false), [ruta])
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [abierto])

  if (!usuario) return null
  const principales = PRINCIPALES.filter((l) => !l.paises || verPaises)
  const analisisActivo = ANALISIS.some((l) => esActivo(ruta, l.href))
  const actual = [...principales, ...ANALISIS, ...ADMIN, { href: '/cuenta', texto: 'Mi cuenta' }]
    .find((l) => esActivo(ruta, l.href))

  return (
    <header className="no-imprimir sticky top-0 z-20 bg-marca pt-[env(safe-area-inset-top)] text-white shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 lg:h-16">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Inicio">
          <IconoLtelc className="h-8 w-8 text-white" fondo={false} />
          <span className="text-base font-bold leading-tight tracking-tight">Gestión Hotelera</span>
        </Link>

        {/* escritorio */}
        <nav className="hidden flex-1 items-center text-sm lg:flex">
          {principales.map((l) => (
            <Link key={l.href} href={l.href}
              className={`relative px-2.5 py-5 transition-colors xl:px-3 ${esActivo(ruta, l.href) ? 'font-semibold text-white' : 'text-neutral-300 hover:text-white'}`}>
              {l.texto}
              {esActivo(ruta, l.href) && <span className="absolute inset-x-2.5 bottom-0 h-0.5 rounded bg-acento" />}
            </Link>
          ))}
          <div className={`px-2.5 ${analisisActivo ? 'font-semibold text-white' : 'text-neutral-300 hover:text-white'}`}>
            <Desplegable boton={<span>Análisis</span>}>
              {ANALISIS.map((l) => <ItemMenu key={l.href} href={l.href} texto={l.texto} activo={esActivo(ruta, l.href)} />)}
            </Desplegable>
          </div>
        </nav>
        <div className="hidden items-center gap-3 text-sm text-neutral-300 lg:flex">
          {instalar && (
            <button onClick={instalar} className="flex items-center gap-1.5 rounded-full border border-neutral-600 px-3 py-1 text-xs hover:border-white hover:text-white">
              <IconoInstalar className="h-3.5 w-3.5" /> Instalar app
            </button>
          )}
          <Desplegable derecha boton={
            <span className="flex items-center gap-2 hover:text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-acento text-xs font-bold text-white">
                {usuario.nombre.trim().charAt(0).toUpperCase()}
              </span>
              <span className="max-w-32 truncate">{usuario.nombre}</span>
            </span>
          }>
            {usuario.admin && ADMIN.map((l) => <ItemMenu key={l.href} href={l.href} texto={l.texto} activo={esActivo(ruta, l.href)} />)}
            <ItemMenu href="/cuenta" texto="Mi cuenta" activo={ruta === '/cuenta'} />
            <form action={cerrarSesion} className="border-t border-neutral-100 mt-1.5 pt-1.5">
              <button type="submit" className="block w-full px-4 py-2 text-left text-acento hover:bg-neutral-100">Salir</button>
            </form>
          </Desplegable>
        </div>

        {/* celular y tablet */}
        <div className="ml-auto flex min-w-0 items-center gap-3 lg:hidden">
          {actual && <span className="truncate text-sm text-neutral-300">{actual.texto}</span>}
          <button onClick={() => setAbierto(true)} aria-label="Abrir menú"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/50" aria-label="Cerrar menú" onClick={() => setAbierto(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto bg-marca pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-acento font-bold">
                  {usuario.nombre.trim().charAt(0).toUpperCase()}
                </span>
                <span className="truncate font-semibold">{usuario.nombre}</span>
              </div>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {[
              { titulo: 'Reportes', links: principales },
              { titulo: 'Análisis', links: ANALISIS },
              { titulo: 'Cuenta', links: [...(usuario.admin ? ADMIN : []), { href: '/cuenta', texto: 'Mi cuenta' }] },
            ].map((s) => (
              <div key={s.titulo} className="px-3 pt-4">
                <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{s.titulo}</div>
                {s.links.map((l) => (
                  <Link key={l.href} href={l.href}
                    className={`flex items-center rounded-lg px-3 py-2.5 text-[15px] ${esActivo(ruta, l.href)
                      ? 'bg-white/10 font-semibold text-white before:mr-2.5 before:h-4 before:w-1 before:rounded before:bg-acento'
                      : 'text-neutral-300 hover:bg-white/5'}`}>
                    {l.texto}
                  </Link>
                ))}
              </div>
            ))}
            <div className="mt-auto space-y-2 px-5 py-5">
              {instalar && (
                <button onClick={instalar} className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-semibold text-neutral-900">
                  <IconoInstalar /> Instalar app
                </button>
              )}
              <form action={cerrarSesion}>
                <button type="submit" className="w-full rounded-full border border-neutral-600 py-2.5 text-sm text-neutral-200">Salir</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
