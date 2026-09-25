'use client'
import { useMemo, useState } from 'react'
import type { HFDia, Hotel } from '@/lib/datos'
import { dinero, entero, pct } from '@/lib/formato'
import { fechaTexto } from './ResumenEjecutivo'
import { AvisoDemo } from './ui'
import LogoHotel from './LogoHotel'

type Props = { demo: boolean; hoteles: Hotel[]; hfDias: HFDia[] }

const sombra = 'tarjeta rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]'

function sumarDias(f: string, n: number) {
  return new Date(new Date(f + 'T12:00:00Z').getTime() + n * 864e5).toISOString().slice(0, 10)
}
function mesAntes(f: string) {
  const d = new Date(f + 'T12:00:00Z')
  const dia = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() - 1)
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(dia, ultimo))
  return d.toISOString().slice(0, 10)
}
const anioAntes = (f: string) => `${Number(f.slice(0, 4)) - 1}${f.slice(4)}`

function Variacion({ actual, ref }: { actual: number; ref: number | undefined }) {
  if (ref === undefined || !ref) return <span className="text-neutral-400">—</span>
  const v = (actual - ref) / Math.abs(ref)
  const sube = v >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1 font-bold tabular-nums ${
      sube ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-acento'}`}>
      {pct(100 * v, 1)}
      <svg viewBox="0 0 10 10" className={`h-3 w-3 ${sube ? '' : 'rotate-180'}`} aria-hidden="true">
        <path d="M5 1 L9 6 H6 V9 H4 V6 H1 Z" fill="currentColor" />
      </svg>
    </span>
  )
}

type Campo = { clave: keyof HFDia; titulo: string; formato: (v: number) => string }

function Indicador({ campo, hoy, refs }: { campo: Campo; hoy: HFDia; refs: [string, HFDia | undefined][] }) {
  const v = (d: HFDia | undefined) => (d ? (d[campo.clave] as number) : undefined)
  return (
    <div className={`${sombra} flex flex-col overflow-hidden border-l-4 border-acento`}>
      <div className="px-4 pb-2 pt-3">
        <div className="text-3xl tabular-nums">{campo.formato(v(hoy)!)}</div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">{campo.titulo}</div>
      </div>
      <div className="mt-auto space-y-1 border-t border-neutral-200 bg-neutral-50 px-4 py-2 text-sm">
        {refs.map(([nombre, d]) => (
          <div key={nombre} className="flex flex-wrap items-center gap-x-1.5">
            <span className="font-semibold">{nombre}</span>
            <span className="tabular-nums text-neutral-600">{d ? campo.formato(v(d)!) : 'sin dato'}</span>
            {d && <Variacion actual={v(hoy)!} ref={v(d)} />}
          </div>
        ))}
      </div>
    </div>
  )
}

const usd = (v: number) => dinero(v, 'USD')
const CAMPOS: Campo[] = [
  { clave: 'rev', titulo: 'Room Revenue', formato: usd },
  { clave: 'arr', titulo: 'Llegadas', formato: entero },
  { clave: 'adr', titulo: 'Average Rate', formato: usd },
  { clave: 'dep', titulo: 'Partidas', formato: entero },
  { clave: 'dind', titulo: 'Deduct Indiv.', formato: entero },
  { clave: 'dgrp', titulo: 'Deduct Group', formato: entero },
]

export default function ComparativaHF({ demo, hoteles, hfDias }: Props) {
  const activos = hoteles.filter((h) => h.activo)
  const [hid, setHid] = useState(activos[0]?.id ?? '')
  const hotel = activos.find((h) => h.id === hid)
  const indice = useMemo(() => new Map(hfDias.filter((d) => d.h === hid).map((d) => [d.f, d])), [hfDias, hid])
  const fechas = useMemo(() => {
    const historia = [...indice.values()].filter((d) => d.tipo === 'History').map((d) => d.f).sort()
    const tope = historia.length ? sumarDias(historia[historia.length - 1], 1) : ''
    return [...indice.keys()].filter((f) => f <= tope).sort().reverse()
  }, [indice])
  const [fechaSel, setFechaSel] = useState('')
  const fecha = fechas.includes(fechaSel) ? fechaSel : fechas[0] ?? ''
  const hoy = indice.get(fecha)
  const refs: [string, HFDia | undefined][] = [
    ['Last day', indice.get(sumarDias(fecha, -1))],
    ['Last month', indice.get(mesAntes(fecha))],
    ['Last year', indice.get(anioAntes(fecha))],
  ]

  return (
    <div className="space-y-4">
      {demo && <AvisoDemo />}
      <div className={`${sombra} grid items-center gap-3 p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto]`}>
        <h1 className="text-base font-bold uppercase tracking-wide">Comparativa H&amp;F</h1>
        <label className="flex flex-col gap-1 text-xs font-semibold text-acento">
          Empresa
          <select value={hid} onChange={(e) => { setHid(e.target.value); setFechaSel('') }}
            className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-normal text-neutral-900">
            {activos.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-acento">
          Fecha
          <select value={fecha} onChange={(e) => setFechaSel(e.target.value)}
            className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-normal text-neutral-900">
            {fechas.map((f) => <option key={f} value={f}>{fechaTexto(f)}</option>)}
          </select>
        </label>
        {hotel && (
          <div className="flex h-16 items-center justify-center border-t border-neutral-100 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <LogoHotel id={hotel.id} nombre={hotel.nombre} alto="h-14" />
          </div>
        )}
      </div>

      {!hoy ? (
        <div className={`${sombra} p-6 text-sm text-neutral-500`}>No hay History &amp; Forecast para esta fecha.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2 flex items-center justify-center rounded-xl bg-acento px-4 py-4 text-center text-lg font-semibold text-white">
              {fechaTexto(fecha)}
            </div>
            <div className={`${sombra} overflow-hidden text-center`}>
              <div className="bg-acento py-1.5 text-sm font-semibold text-white">Ocupación</div>
              <div className="py-3 text-2xl tabular-nums">{pct(100 * hoy.pct, 2)}</div>
            </div>
            <div className={`${sombra} overflow-hidden text-center`}>
              <div className="bg-acento py-1.5 text-sm font-semibold text-white">Huéspedes</div>
              <div className="py-3 text-2xl tabular-nums">{entero(hoy.pax)}</div>
            </div>
          </div>

          <div className={`${sombra} border-l-4 border-acento p-4 text-center`}>
            <div className="text-4xl tabular-nums">{entero(hoy.occ)}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">Total ocupación</div>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-neutral-50 py-3 text-sm">
              {refs.map(([nombre, d]) => (
                <div key={nombre} className="space-y-1">
                  <div className="font-semibold">{nombre}</div>
                  <div className="tabular-nums text-neutral-600">{d ? entero(d.occ) : 'sin dato'}</div>
                  {d && <Variacion actual={hoy.occ} ref={d.occ} />}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPOS.map((c) => <Indicador key={c.clave} campo={c} hoy={hoy} refs={refs} />)}
          </div>
          <p className="text-xs text-neutral-500">
            {hoy.tipo === 'Forecast' ? 'La fecha elegida todavía es forecast (on the books). ' : ''}
            Last day: día anterior · Last month: mismo día del mes anterior · Last year: mismo día del año anterior.
          </p>
        </>
      )}
    </div>
  )
}
