'use client'
import Link from 'next/link'
import type { ReactNode } from 'react'

// Piezas visuales compartidas por los módulos de Gestión

export function Encabezado({ titulo, bajada, children }: { titulo: string; bajada?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="titulo">{titulo}</h1>
        {bajada && <p className="mt-1 max-w-3xl text-sm text-neutral-500">{bajada}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function SelectorHotel({ hoteles, actual, base }: { hoteles: { id: string; nombre: string }[]; actual: string; base: string }) {
  if (hoteles.length < 2) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {hoteles.map((h) => (
        <Link key={h.id} href={`${base}?hotel=${h.id}`}
          className={`rounded-full border px-3 py-1 text-sm ${h.id === actual ? 'border-marca bg-marca text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'}`}>
          {h.nombre}
        </Link>
      ))}
    </div>
  )
}

export function Pildora({ texto, color, fondo }: { texto: string; color: string; fondo: string }) {
  return <span className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color, background: fondo }}>{texto}</span>
}

export function Barra({ valor, color = '#1c1c1c', alto = 'h-1.5' }: { valor: number; color?: string; alto?: string }) {
  return (
    <div className={`${alto} w-full overflow-hidden rounded-full bg-neutral-200`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%`, background: color }} />
    </div>
  )
}

export function Boton({ children, onClick, tipo = 'secundario', type = 'button', disabled, className = '' }: {
  children: ReactNode; onClick?: () => void; tipo?: 'principal' | 'secundario' | 'peligro'; type?: 'button' | 'submit'; disabled?: boolean; className?: string
}) {
  const estilos = {
    principal: 'bg-marca text-white hover:bg-black',
    secundario: 'border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-500',
    peligro: 'border border-red-200 bg-white text-acento hover:bg-red-50',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${estilos[tipo]} ${className}`}>
      {children}
    </button>
  )
}

export function Pestanas<T extends string>({ valor, opciones, onChange }: { valor: T; opciones: { valor: T; texto: string; extra?: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none]">
      <div className="flex min-w-max gap-1 border-b border-neutral-200">
        {opciones.map((o) => (
          <button key={o.valor} type="button" onClick={() => onChange(o.valor)}
            className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${o.valor === valor ? 'border-acento font-semibold text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>
            {o.texto}{o.extra}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Modal({ titulo, onCerrar, children, ancho = 'max-w-lg' }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div className={`max-h-[92dvh] w-full ${ancho} overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const entrada = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-marca'

export const pct0 = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)
export const pct1 = (v: number | null) => (v === null ? '—' : `${(v * 100).toLocaleString('es-AR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`)
export const fechaCortaAR = (iso: string) => (iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—')
