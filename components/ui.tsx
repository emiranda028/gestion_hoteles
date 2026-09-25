'use client'
import type { ReactNode } from 'react'

export function Tarjeta({ titulo, extra, children, className = '' }: {
  titulo?: ReactNode
  extra?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`tarjeta rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] ${className}`}>
      {(titulo || extra) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-base font-bold text-neutral-900">{titulo}</h2>}
          {extra}
        </div>
      )}
      {children}
    </section>
  )
}

export function Kpi({ titulo, valor, detalle, variacion, positivoEsBueno = true }: {
  titulo: string
  valor: string
  detalle?: string
  variacion?: { texto: string; valor: number | null }
  positivoEsBueno?: boolean
}) {
  const v = variacion?.valor
  const color =
    v === null || v === undefined || v === 0
      ? 'text-neutral-500'
      : (v > 0) === positivoEsBueno
        ? 'text-emerald-700'
        : 'text-acento'
  return (
    <div className="tarjeta h-full rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{titulo}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{valor}</div>
      <div className="mt-1 flex flex-wrap gap-x-2 text-xs">
        {variacion && <span className={`font-medium ${color}`}>{variacion.texto}</span>}
        {detalle && <span className="text-neutral-500">{detalle}</span>}
      </div>
    </div>
  )
}

export function Selector<T extends string>({ valor, opciones, onChange, etiqueta }: {
  valor: T
  opciones: { valor: T; texto: string }[]
  onChange: (v: T) => void
  etiqueta?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-500">
      {etiqueta}
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>{o.texto}</option>
        ))}
      </select>
    </label>
  )
}

export function Segmentado<T extends string>({ valor, opciones, onChange }: {
  valor: T
  opciones: { valor: T; texto: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-full border border-neutral-300 bg-white p-0.5 text-sm">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={`rounded-full px-3.5 py-1 ${valor === o.valor ? 'bg-marca text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  )
}

export function Campo({ etiqueta, valor, onChange, sufijo, paso = 1, min, max, ayuda }: {
  etiqueta: string
  valor: number
  onChange: (v: number) => void
  sufijo?: string
  paso?: number
  min?: number
  max?: number
  ayuda?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-600" title={ayuda}>
      <span>
        {etiqueta}
        {ayuda && <span className="ml-1 cursor-help text-neutral-400">ⓘ</span>}
      </span>
      <div className="flex items-center rounded-md border border-neutral-300 bg-white focus-within:border-marca">
        <input
          type="number"
          value={Number.isFinite(valor) ? valor : 0}
          step={paso}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full rounded-md bg-transparent px-2 py-1.5 text-sm tabular-nums text-neutral-900 outline-none"
        />
        {sufijo && <span className="whitespace-nowrap pr-2 text-xs text-neutral-400">{sufijo}</span>}
      </div>
    </label>
  )
}

export function AvisoDemo() {
  return (
    <div className="no-imprimir mb-4 border-l-4 border-acento bg-white px-4 py-2 text-sm text-neutral-800">
      <strong>Datos de demostración.</strong> Cuando la ingesta automática procese los primeros PDF
      (o se importe el Excel histórico), el tablero pasa a mostrar los datos reales.
    </div>
  )
}
