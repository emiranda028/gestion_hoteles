'use client'
import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FlashDia, Hotel, ValoresFlash } from '@/lib/datos'
import { decimal, dinero, entero, fechaCorta, pct, variacionTexto } from '@/lib/formato'
import { Rubros, fechaTexto } from './ResumenEjecutivo'
import { AvisoDemo, Selector, Tarjeta } from './ui'
import { COLORES } from './colores'

const PERIODOS = [['Día', 'd'], ['Mes', 'm'], ['Año', 'a']] as const
type P = (typeof PERIODOS)[number][1]
const anioAntes = (f: string) => `${Number(f.slice(0, 4)) - 1}${f.slice(4)}`

function valores(d: FlashDia, p: P): ValoresFlash {
  return p === 'd' ? d : p === 'm' ? d.mes : d.anio
}

function Var({ act, ant, puntos = false }: { act: number; ant: number | undefined; puntos?: boolean }) {
  if (ant === undefined || (!puntos && !ant)) return <div className="h-4" />
  const v = puntos ? act - ant : (act - ant) / Math.abs(ant)
  return (
    <div className={`text-[11px] tabular-nums ${v >= 0 ? 'text-emerald-700' : 'text-acento'}`}>
      {variacionTexto(v, puntos)}
    </div>
  )
}

export default function ManagerFlash({ demo, hoteles, flashDias }: { demo: boolean; hoteles: Hotel[]; flashDias: FlashDia[] }) {
  const activos = hoteles.filter((h) => h.activo && flashDias.some((d) => d.h === h.id))
  const [hotel, setHotel] = useState(activos[0]?.id ?? '')
  const delHotel = useMemo(() => flashDias.filter((d) => d.h === hotel).sort((a, b) => b.r.localeCompare(a.r)), [flashDias, hotel])
  const [fechaSel, setFechaSel] = useState('')
  const d = delHotel.find((x) => x.r === fechaSel) ?? delHotel[0]
  const ant = d && flashDias.find((x) => x.h === hotel && x.f === anioAntes(d.f))

  const ultimos30 = useMemo(() => {
    if (!d) return []
    return delHotel.filter((x) => x.f <= d.f).slice(0, 30).reverse().map((x) => ({
      etiqueta: fechaCorta(x.f), aloj: x.rev, ayb: x.ayb, otros: Math.max(0, x.otros), occ: x.hab ? (100 * x.ocup) / x.hab : 0,
    }))
  }, [delHotel, d])

  if (!d) return <Tarjeta><p className="text-sm text-neutral-500">Todavía no hay Manager Flash cargados.</p></Tarjeta>

  const filasOcupacion: { titulo: string; v: (x: ValoresFlash) => number; fmt: (n: number) => string; puntos?: boolean }[] = [
    { titulo: 'Habitaciones disponibles', v: (x) => x.hab, fmt: entero },
    { titulo: 'Habitaciones ocupadas (vendidas)', v: (x) => x.ocup, fmt: entero },
    { titulo: 'Tasa de ocupación', v: (x) => (x.hab ? (100 * x.ocup) / x.hab : 0), fmt: (n) => pct(n, 2), puntos: true },
    { titulo: 'Huéspedes', v: (x) => x.pax, fmt: entero },
    { titulo: 'Tasa doble ocupación', v: (x) => (x.ocup ? x.pax / x.ocup : 0), fmt: (n) => decimal(n, 2) },
  ]

  return (
    <div className="space-y-5">
      {demo && <AvisoDemo />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo">Manager Flash</h1>
          <p className="text-sm text-neutral-500">
            Cierre del {fechaTexto(d.f)} · en USD · debajo de cada valor, la variación contra el mismo día del año anterior
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Selector etiqueta="Hotel" valor={hotel} onChange={(h) => { setHotel(h); setFechaSel('') }}
            opciones={activos.map((h) => ({ valor: h.id, texto: h.nombre }))} />
          <Selector etiqueta="Fecha del informe" valor={d.r} onChange={setFechaSel}
            opciones={delHotel.map((x) => ({ valor: x.r, texto: fechaTexto(x.r) }))} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.6fr]">
        <Tarjeta titulo="Ocupación">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr>
                <th />
                {PERIODOS.map(([t]) => (
                  <th key={t} className="bg-acento px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-white first-of-type:rounded-l-md last:rounded-r-md">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasOcupacion.map((fila) => (
                <tr key={fila.titulo} className="border-b border-neutral-100 last:border-0">
                  <td className="py-3 pr-2 text-xs font-semibold text-neutral-600">{fila.titulo}</td>
                  {PERIODOS.map(([, p]) => {
                    const act = fila.v(valores(d, p))
                    return (
                      <td key={p} className="px-0.5 py-3 text-center sm:px-1">
                        <div className="whitespace-nowrap text-[13px] font-semibold sm:text-base">{fila.fmt(act)}</div>
                        <Var act={act} ant={ant ? fila.v(valores(ant, p)) : undefined} puntos={fila.puntos} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Tarjeta>

        <div className="grid gap-3 md:grid-cols-3">
          {PERIODOS.map(([t, p]) => {
            const x = valores(d, p)
            const y = ant ? valores(ant, p) : undefined
            return (
              <div key={p} className="space-y-3">
                <div className="rounded-xl bg-marca px-3 py-2 text-center text-white">
                  <div className="text-[11px] uppercase tracking-widest text-neutral-300">Ventas · {t}</div>
                  <div className="text-2xl font-bold tabular-nums">{dinero(x.tot, 'USD')}</div>
                  {y && y.tot ? <div className={`text-[11px] ${x.tot >= y.tot ? 'text-emerald-300' : 'text-red-300'}`}>{variacionTexto((x.tot - y.tot) / y.tot)} vs año anterior</div> : null}
                </div>
                <Tarjeta titulo={`Ventas por rubro · ${t.toLowerCase()}`}><Rubros d={x} /></Tarjeta>
                <div className="grid grid-cols-2 gap-3">
                  <div className="tarjeta rounded-xl bg-white p-3 text-center shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                    <div className="text-xl font-bold tabular-nums">{dinero(x.adr, 'USD')}</div>
                    <div className="text-xs text-neutral-500">ADR</div>
                    <Var act={x.adr} ant={y?.adr} />
                  </div>
                  <div className="tarjeta rounded-xl bg-white p-3 text-center shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                    <div className="text-xl font-bold tabular-nums">{dinero(x.hab ? x.rev / x.hab : 0, 'USD')}</div>
                    <div className="text-xs text-neutral-500">RevPar</div>
                    <Var act={x.hab ? x.rev / x.hab : 0} ant={y && y.hab ? y.rev / y.hab : undefined} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Tarjeta titulo="Últimos 30 días: ventas por rubro y ocupación">
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={ultimos30} margin={{ left: 0, right: 8 }}>
              <CartesianGrid stroke={COLORES.grilla} vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} minTickGap={12} />
              <YAxis yAxisId="u" tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => dinero(v, 'USD', true)} />
              <YAxis yAxisId="o" orientation="right" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v, n) => (n === 'Ocupación' ? pct(Number(v), 1) : dinero(Number(v), 'USD'))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="u" dataKey="aloj" stackId="v" name="Alojamiento" fill={COLORES.acento} />
              <Bar yAxisId="u" dataKey="ayb" stackId="v" name="Alimentos & Bebidas" fill={COLORES.gris} />
              <Bar yAxisId="u" dataKey="otros" stackId="v" name="Diversas" fill="#4a4a4a" radius={[3, 3, 0, 0]} />
              <Line yAxisId="o" dataKey="occ" name="Ocupación" stroke={COLORES.principal} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Tarjeta>
    </div>
  )
}
