'use client'
import { useEffect, useMemo, useState } from 'react'
import type { Disponible, FilaDisponible, FlashDia, Hotel } from '@/lib/datos'
import { verCuadroDisponibilidades } from '@/app/acciones'
import { decimal, dinero, entero } from '@/lib/formato'
import { Medidor, Rubros, fechaTexto } from './ResumenEjecutivo'
import { AvisoDemo } from './ui'
import LogoHotel from './LogoHotel'

type Props = { demo: boolean; hoteles: Hotel[]; flashDias: FlashDia[]; disponibles: Disponible[] }

const miles = (v: number) => Math.round(v).toLocaleString('es-AR')
const sombra = 'tarjeta rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]'

function Dato({ titulo, valor, grande = false }: { titulo: string; valor: string; grande?: boolean }) {
  return (
    <div className={`${sombra} flex flex-col items-center justify-center p-3 text-center`}>
      <div className={`font-bold tabular-nums ${grande ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>{valor}</div>
      <div className="text-sm text-neutral-600">{titulo}</div>
    </div>
  )
}

function Rotulo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className={`${sombra} overflow-hidden text-center`}>
      <div className="bg-acento py-1.5 text-sm font-semibold text-white">{titulo}</div>
      <div className="py-3 text-2xl tabular-nums">{valor}</div>
    </div>
  )
}

function Cuadro({ filas }: { filas: FilaDisponible[] }) {
  const celda = (v: number | null) => (v === null ? '' : miles(v))
  return (
    <div className={`${sombra} overflow-x-auto p-2`}>
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="bg-acento text-xs text-white">
            <th className="px-1.5 py-1.5 sm:px-2 text-left">Concepto</th>
            <th className="px-1.5 py-1.5 sm:px-2 text-right">ARS</th>
            <th className="px-1.5 py-1.5 sm:px-2 text-right">EUR</th>
            <th className="px-1.5 py-1.5 sm:px-2 text-right">USD</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const total = f.concepto === 'DISPONIBILIDADES'
            return (
              <tr key={f.concepto} className={`border-b border-neutral-100 ${total ? 'font-bold' : ''}`}>
                <td className="px-1.5 py-1.5 sm:px-2">{f.concepto}</td>
                <td className="px-1.5 py-1.5 sm:px-2 text-right tabular-nums">{celda(f.ars)}</td>
                <td className="px-1.5 py-1.5 sm:px-2 text-right tabular-nums">{celda(f.eur)}</td>
                <td className="px-1.5 py-1.5 sm:px-2 text-right tabular-nums">{celda(f.usd)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function ResumenHotel({ demo, hoteles, flashDias, disponibles }: Props) {
  const activos = hoteles.filter((h) => h.activo)
  const [hid, setHid] = useState(activos[0]?.id ?? '')
  const hotel = activos.find((h) => h.id === hid)
  const fechas = useMemo(
    () => [...new Set(flashDias.filter((d) => d.h === hid).map((d) => d.r))].sort().reverse(),
    [flashDias, hid],
  )
  const [fechaSel, setFechaSel] = useState('')
  const fecha = fechas.includes(fechaSel) ? fechaSel : fechas[0] ?? ''
  const d = flashDias.find((x) => x.h === hid && x.r === fecha)
  const disp = [...disponibles].reverse().find((x) => x.g === hotel?.grupo && x.f <= fecha)

  const [cuadro, setCuadro] = useState<FilaDisponible[]>([])
  useEffect(() => {
    let vigente = true
    if (disp) verCuadroDisponibilidades(disp.g, disp.f).then((c) => vigente && setCuadro(c))
    else setCuadro([])
    return () => { vigente = false }
  }, [disp?.g, disp?.f]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!hotel) return <p className="text-sm text-neutral-500">No hay hoteles con datos.</p>
  const occ = d && d.hab ? (100 * d.ocup) / d.hab : 0

  return (
    <div className="space-y-4">
      {demo && <AvisoDemo />}
      <div className={`${sombra} grid items-center gap-3 p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto]`}>
        <h1 className="text-base font-bold uppercase tracking-wide">Resumen ejecutivo</h1>
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

      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr_1.35fr] [&>*]:min-w-0">
        {!d ? (
          <div className={`${sombra} p-6 text-sm text-neutral-500 lg:col-span-2`}>No llegó el Manager Flash de esta fecha.</div>
        ) : (
          <>
            <div className="space-y-3">
              <Dato titulo="Ventas Totales" valor={dinero(d.tot, 'USD')} grande />
              <div className="grid grid-cols-2 gap-3">
                <Dato titulo="ADR" valor={dinero(d.adr, 'USD')} />
                <Dato titulo="RevPar" valor={dinero(d.hab ? d.rev / d.hab : 0, 'USD')} />
              </div>
              <div className={`${sombra} p-3 text-center`}>
                <div className="mb-2 text-sm text-neutral-600">Ventas por rubro</div>
                <Rubros d={d} />
              </div>
            </div>
            <div className="grid grid-cols-2 content-start gap-3 lg:grid-cols-1">
              <div className={`${sombra} col-span-2 flex flex-col items-center p-3 lg:col-span-1`}>
                <div className="text-lg font-semibold">Tasa Ocupación</div>
                <Medidor valor={occ} />
              </div>
              <Rotulo titulo="Habitaciones Ocupadas" valor={entero(d.ocup)} />
              <Rotulo titulo="Huéspedes" valor={entero(d.pax)} />
              <div className="col-span-2 lg:col-span-1">
                <Rotulo titulo="Tasa Doble Ocupación" valor={d.ocup ? decimal(d.pax / d.ocup, 2) : '—'} />
              </div>
            </div>
          </>
        )}

        <div className="space-y-3 lg:border-l-4 lg:border-acento lg:pl-4">
          {disp ? (
            <>
              <div className={`${sombra} overflow-hidden text-center`}>
                <div className="bg-marca py-2 font-semibold text-white">Total Disponibilidades</div>
                <div className="py-3 text-3xl font-bold tabular-nums">{miles(disp.total)}</div>
              </div>
              <Dato titulo="Disponibilidades Moneda local $" valor={miles(disp.monedaLocal)} />
              <div className="grid grid-cols-[1.6fr_1fr] gap-3">
                <Dato titulo="Disponibilidades Moneda Extranjera" valor={miles(disp.monedaExtranjera)} />
                <div className="grid gap-3">
                  <Dato titulo="USD" valor={miles(disp.usd)} />
                  <Dato titulo="EUR" valor={miles(disp.eur)} />
                </div>
              </div>
              {cuadro.length > 0 && <Cuadro filas={cuadro} />}
              {disp.f !== fecha && <p className="text-xs text-neutral-500">Último informe recibido: {fechaTexto(disp.f)}.</p>}
            </>
          ) : (
            <div className={`${sombra} p-6 text-sm text-neutral-500`}>Sin informe de disponibilidades.</div>
          )}
        </div>
      </div>
    </div>
  )
}
