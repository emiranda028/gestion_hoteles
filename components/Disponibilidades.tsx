'use client'
import { useMemo, useState } from 'react'
import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { CuentaBanco, Disponible, Grupo } from '@/lib/datos'
import { sumarDias } from '@/lib/kpi'
import { dinero, fechaCorta, fechaLarga, variacionTexto } from '@/lib/formato'
import { AvisoDemo, Kpi, Segmentado, Selector, Tarjeta } from './ui'
import { COLORES } from './colores'

type Props = { demo: boolean; grupos: Grupo[]; disponibles: Disponible[]; cuentas: CuentaBanco[] }

// Montos tal cual los informa cada grupo: pesos en pesos, dólares y euros en su moneda.
const SUMABLES = ['total', 'subtotal', 'monedaLocal', 'monedaExtranjera', 'usd', 'eur', 'bancosPesos', 'inversiones',
  'cobros', 'cheques', 'pagos'] as const

function consolidar(xs: Disponible[]): Disponible {
  const r = { ...xs[0] }
  for (const k of SUMABLES) r[k] = xs.reduce((s, x) => s + x[k], 0)
  return r
}

const pesos = (v: number) => dinero(v, 'ARS', true)
const euros = (v: number) => `€ ${Math.round(v).toLocaleString('es-AR')}`

export default function Disponibilidades({ demo, grupos, disponibles, cuentas }: Props) {
  const [grupo, setGrupo] = useState<string>(grupos[0]?.id ?? 'todos')
  const [rango, setRango] = useState<'90' | '180' | '365'>('90')

  const serie = useMemo(() => {
    const ids = grupo === 'todos' ? grupos.map((g) => g.id) : [grupo]
    const porFecha = new Map<string, Disponible[]>()
    for (const d of disponibles) {
      if (!ids.includes(d.g)) continue
      porFecha.set(d.f, [...(porFecha.get(d.f) ?? []), d])
    }
    return [...porFecha].filter(([, l]) => l.length === ids.length).map(([, l]) => consolidar(l))
      .sort((a, b) => a.f.localeCompare(b.f))
  }, [disponibles, grupos, grupo])

  if (!serie.length) {
    return <Tarjeta><p className="text-sm text-neutral-500">Todavía no hay informes de disponibilidades.</p></Tarjeta>
  }
  const hoy = serie[serie.length - 1]
  const s7 = [...serie].reverse().find((x) => x.f <= sumarDias(hoy.f, -7))
  const v7 = (k: (typeof SUMABLES)[number]) =>
    s7 ? { texto: `${variacionTexto((hoy[k] - s7[k]) / Math.abs(s7[k] || 1))} vs 7 días`, valor: hoy[k] - s7[k] } : undefined
  const desde = sumarDias(hoy.f, -Number(rango))
  const grafico = serie.filter((x) => x.f >= desde).map((x) => ({ ...x, etiqueta: fechaCorta(x.f) }))
  const ctas = cuentas.filter((c) => grupo === 'todos' || c.g === grupo)
  const secciones = ['Bancos pesos', 'Moneda extranjera', 'Inversiones', 'Cobros proyectados', 'Pagos proyectados']
  const unGrupo = grupo !== 'todos'

  return (
    <div className="space-y-5">
      {demo && <AvisoDemo />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo">Disponibilidades</h1>
          <p className="text-sm text-neutral-500">
            Informe del {fechaLarga(hoy.f)}, tal como lo envía el grupo
            {unGrupo && hoy.tcUsd ? ` · tipo de cambio informado US$ 1 = $ ${hoy.tcUsd.toLocaleString('es-AR')}` : ''}
          </p>
        </div>
        <Selector etiqueta="Grupo" valor={grupo} onChange={setGrupo}
          opciones={[...grupos.map((g) => ({ valor: g.id, texto: g.nombre })), { valor: 'todos', texto: 'Todos' }]} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi titulo="Disponibilidades" valor={pesos(hoy.total)} variacion={v7('total')} detalle="incluye proyectados" />
        <Kpi titulo="Moneda local" valor={pesos(hoy.monedaLocal)} variacion={v7('monedaLocal')} />
        <Kpi titulo="Moneda extranjera" valor={dinero(hoy.usd, 'USD', true)} variacion={v7('usd')}
          detalle={`${hoy.eur > 1 ? `+ ${euros(hoy.eur)} · ` : ''}valuada ${pesos(hoy.monedaExtranjera)}`} />
        <Kpi titulo="Bancos en pesos" valor={pesos(hoy.bancosPesos)} variacion={v7('bancosPesos')} />
        <Kpi titulo="Inversiones (FCI)" valor={pesos(hoy.inversiones)} variacion={v7('inversiones')} />
        <Kpi titulo="Proyectado" valor={pesos(hoy.cobros + hoy.cheques + hoy.pagos)}
          detalle={`cobros ${pesos(hoy.cobros)} · cheques ${pesos(Math.abs(hoy.cheques))} · pagos ${pesos(Math.abs(hoy.pagos))}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta titulo="Disponibilidades en pesos" className="lg:col-span-2"
          extra={<Segmentado valor={rango} onChange={setRango}
            opciones={[{ valor: '90', texto: '90 días' }, { valor: '180', texto: '6 meses' }, { valor: '365', texto: '1 año' }]} />}>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={grafico} margin={{ left: 0, right: 8 }}>
                <CartesianGrid stroke={COLORES.grilla} vertical={false} />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} minTickGap={20} />
                <YAxis tick={{ fontSize: 11 }} width={80} tickFormatter={(v: number) => pesos(v)} />
                <Tooltip formatter={(v) => dinero(Number(v), 'ARS')} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="monedaExtranjera" stackId="d" name="Moneda extranjera (valuada)" fill={COLORES.principal} stroke={COLORES.principal} fillOpacity={0.85} />
                <Area dataKey="inversiones" stackId="d" name="Inversiones" fill={COLORES.acento} stroke={COLORES.acento} fillOpacity={0.8} />
                <Area dataKey="bancosPesos" stackId="d" name="Bancos en pesos" fill={COLORES.gris} stroke={COLORES.gris} fillOpacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>
        <Tarjeta titulo="Dólares">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={grafico} margin={{ left: 0, right: 8 }}>
                <CartesianGrid stroke={COLORES.grilla} vertical={false} />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} minTickGap={20} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => dinero(v, 'USD', true)} />
                <Tooltip formatter={(v) => dinero(Number(v), 'USD')} />
                <Line dataKey="usd" name="Dólares" stroke={COLORES.principal} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>
      </div>

      {ctas.length > 0 && (
        <Tarjeta titulo={`Detalle del último informe (${fechaLarga(ctas[0].f)})`}>
          <div className="grid gap-6 lg:grid-cols-2">
            {secciones.map((sec) => {
              const filas = ctas.filter((c) => c.seccion === sec && Math.abs(c.ars) > 1)
              if (!filas.length) return null
              const total = filas.reduce((s, c) => s + c.ars, 0)
              const extranjera = sec === 'Moneda extranjera'
              return (
                <div key={sec}>
                  <h3 className="mb-1 flex justify-between border-b-2 border-marca pb-1 text-sm font-semibold uppercase tracking-wide">
                    <span>{sec}</span><span className="tabular-nums">{dinero(total, 'ARS')}</span>
                  </h3>
                  <table className="w-full text-sm tabular-nums">
                    <tbody>
                      {filas.sort((a, b) => Math.abs(b.ars) - Math.abs(a.ars)).map((c, i) => (
                        <tr key={i} className="border-t border-neutral-100">
                          <td className="py-1 pr-2">
                            {c.banco}
                            <div className="text-[11px] text-neutral-500">{[c.cuenta, c.empresa].filter(Boolean).join(' · ')}</div>
                          </td>
                          {extranjera && (
                            <td className="py-1 pr-3 text-right text-neutral-600">
                              {c.moneda === 'EUR' ? euros(c.original) : dinero(c.original, 'USD')}
                            </td>
                          )}
                          <td className={`py-1 text-right ${c.ars < 0 ? 'text-acento' : ''}`}>{dinero(c.ars, 'ARS')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </Tarjeta>
      )}
    </div>
  )
}
