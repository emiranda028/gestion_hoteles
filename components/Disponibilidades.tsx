'use client'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CuentaBanco, Disponible, Grupo } from '@/lib/datos'
import { sumarDias } from '@/lib/kpi'
import { dinero, fechaCorta, fechaLarga, variacionTexto } from '@/lib/formato'
import { AvisoDemo, Kpi, Segmentado, Selector, Tarjeta } from './ui'

type Moneda = 'usd' | 'ars'
type Props = { demo: boolean; grupos: Grupo[]; disponibles: Disponible[]; cuentas: CuentaBanco[] }

/** Pasa un registro diario a la moneda elegida. Los dólares se toman por su monto original. */
function valuar(d: Disponible, m: Moneda) {
  const k = m === 'usd' ? 1 / d.tc : 1
  const pesos = d.pesos * k
  const dolares = m === 'usd' ? d.usd : d.usd * d.tc
  const euros = d.eurArs * k
  const disponible = pesos + dolares + euros
  return {
    f: d.f, pesos, dolares, euros, disponible, inversiones: d.inversiones * k, bancosPesos: d.bancosPesos * k,
    cobros: d.cobros * k, pagos: d.pagos * k, proyectado: d.proyectado * k, total: disponible + d.proyectado * k, tc: d.tc,
  }
}

type Valuado = ReturnType<typeof valuar>

function consolidar(xs: Valuado[]): Valuado {
  const r = { ...xs[0] }
  for (const k of ['pesos', 'dolares', 'euros', 'disponible', 'inversiones', 'bancosPesos', 'cobros', 'pagos', 'proyectado', 'total'] as const) {
    r[k] = xs.reduce((s, x) => s + x[k], 0)
  }
  return r
}

export default function Disponibilidades({ demo, grupos, disponibles, cuentas }: Props) {
  const [grupo, setGrupo] = useState<string>('todos')
  const [moneda, setMoneda] = useState<Moneda>('usd')
  const [rango, setRango] = useState<'90' | '180' | '365'>('90')
  const cod = moneda === 'usd' ? 'USD' : 'ARS'

  const serie = useMemo(() => {
    const ids = grupo === 'todos' ? grupos.map((g) => g.id) : [grupo]
    const porFecha = new Map<string, Valuado[]>()
    for (const d of disponibles) {
      if (!ids.includes(d.g)) continue
      const l = porFecha.get(d.f)
      if (l) l.push(valuar(d, moneda))
      else porFecha.set(d.f, [valuar(d, moneda)])
    }
    // solo días en que informaron todos los grupos elegidos
    return [...porFecha].filter(([, l]) => l.length === ids.length).map(([, l]) => consolidar(l))
      .sort((a, b) => a.f.localeCompare(b.f))
  }, [disponibles, grupos, grupo, moneda])

  if (!serie.length) {
    return <Tarjeta><p className="text-sm text-slate-500">Todavía no hay informes de disponibilidades.</p></Tarjeta>
  }
  const hoy = serie[serie.length - 1]
  const hace = (n: number) => [...serie].reverse().find((x) => x.f <= sumarDias(hoy.f, -n))
  const s7 = hace(7), s30 = hace(30)
  const var7 = (k: keyof Valuado) => (s7 ? { texto: `${variacionTexto((Number(hoy[k]) - Number(s7[k])) / Math.abs(Number(s7[k]) || 1))} vs 7 días`, valor: Number(hoy[k]) - Number(s7[k]) } : undefined)
  const desde = sumarDias(hoy.f, -Number(rango))
  const grafico = serie.filter((x) => x.f >= desde).map((x) => ({ ...x, etiqueta: fechaCorta(x.f) }))
  const ctas = cuentas.filter((c) => grupo === 'todos' || c.g === grupo)
  const aUsd = (c: CuentaBanco) => (c.moneda === 'USD' ? c.original : c.ars / hoy.tc)
  const valorCuenta = (c: CuentaBanco) => (moneda === 'usd' ? aUsd(c) : c.ars)
  const secciones = ['Bancos pesos', 'Moneda extranjera', 'Inversiones', 'Cobros proyectados', 'Pagos proyectados']

  return (
    <div className="space-y-4">
      {demo && <AvisoDemo />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Disponibilidades</h1>
          <p className="text-sm text-slate-500">
            Informe del {fechaLarga(hoy.f)} · pesos convertidos al dólar BNA vendedor del día ($ {hoy.tc.toLocaleString('es-AR')})
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Selector etiqueta="Grupo" valor={grupo} onChange={setGrupo}
            opciones={[{ valor: 'todos', texto: 'Todos' }, ...grupos.map((g) => ({ valor: g.id, texto: g.nombre }))]} />
          <Segmentado valor={moneda} onChange={setMoneda}
            opciones={[{ valor: 'usd', texto: 'USD' }, { valor: 'ars', texto: 'ARS (BNA)' }]} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi titulo="Disponible" valor={dinero(hoy.disponible, cod, true)} variacion={var7('disponible')}
          detalle={s30 ? `${variacionTexto((hoy.disponible - s30.disponible) / Math.abs(s30.disponible || 1))} vs 30 días` : undefined} />
        <Kpi titulo="En dólares" valor={dinero(hoy.dolares, cod, true)} variacion={var7('dolares')} />
        <Kpi titulo="Bancos en pesos" valor={dinero(hoy.bancosPesos, cod, true)} variacion={var7('bancosPesos')} />
        <Kpi titulo="Inversiones (FCI)" valor={dinero(hoy.inversiones, cod, true)} variacion={var7('inversiones')} />
        <Kpi titulo="Proyectado neto" valor={dinero(hoy.proyectado, cod, true)}
          detalle={`cobros ${dinero(hoy.cobros, cod, true)} · pagos ${dinero(-hoy.pagos, cod, true)}`}
          variacion={{ texto: hoy.proyectado >= 0 ? 'entra más de lo que sale' : 'sale más de lo que entra', valor: hoy.proyectado }} />
        <Kpi titulo="Total con proyectados" valor={dinero(hoy.total, cod, true)} variacion={var7('total')} />
      </div>

      <Tarjeta titulo="Evolución del disponible"
        extra={<Segmentado valor={rango} onChange={setRango}
          opciones={[{ valor: '90', texto: '90 días' }, { valor: '180', texto: '6 meses' }, { valor: '365', texto: '1 año' }]} />}>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={grafico} margin={{ left: 0, right: 8 }}>
              <CartesianGrid stroke="#eef2f4" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} minTickGap={20} />
              <YAxis tick={{ fontSize: 11 }} width={80} tickFormatter={(v: number) => dinero(v, cod, true)} />
              <Tooltip formatter={(v) => dinero(Number(v), cod)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area dataKey="dolares" stackId="d" name="Dólares" fill="#0f4c5c" stroke="#0f4c5c" fillOpacity={0.8} />
              <Area dataKey="inversiones" stackId="d" name="Inversiones" fill="#e36414" stroke="#e36414" fillOpacity={0.7} />
              <Area dataKey="bancosPesos" stackId="d" name="Bancos en pesos" fill="#94a3b8" stroke="#94a3b8" fillOpacity={0.7} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          En USD, los saldos en pesos se convierten con el BNA vendedor de cada día; los dólares se muestran por su monto original.
        </p>
      </Tarjeta>

      {ctas.length > 0 && (
        <Tarjeta titulo={`Detalle del último informe (${fechaLarga(ctas[0].f)})`}>
          <div className="grid gap-6 lg:grid-cols-2">
            {secciones.map((sec) => {
              const filas = ctas.filter((c) => c.seccion === sec && Math.abs(c.ars) > 1)
              if (!filas.length) return null
              const total = filas.reduce((s, c) => s + valorCuenta(c), 0)
              return (
                <div key={sec}>
                  <h3 className="mb-1 flex justify-between text-sm font-semibold text-slate-700">
                    <span>{sec}</span><span className="tabular-nums">{dinero(total, cod)}</span>
                  </h3>
                  <table className="w-full text-sm tabular-nums">
                    <tbody>
                      {filas.sort((a, b) => Math.abs(valorCuenta(b)) - Math.abs(valorCuenta(a))).map((c, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="py-1 pr-2">
                            {c.banco}
                            <div className="text-[11px] text-slate-500">{[c.cuenta, c.empresa].filter(Boolean).join(' · ')}</div>
                          </td>
                          <td className={`py-1 text-right ${valorCuenta(c) < 0 ? 'text-red-600' : ''}`}>{dinero(valorCuenta(c), cod)}</td>
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
