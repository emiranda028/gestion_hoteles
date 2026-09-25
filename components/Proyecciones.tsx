'use client'
import { useMemo, useState } from 'react'
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Hotel } from '@/lib/datos'
import type { Dia } from '@/lib/kpi'
import { dinero, entero, mesCorto, pct } from '@/lib/formato'
import { ESCENARIOS_BASE, type Escenario, estimarSupuestos, historicoMensual, proyectar } from '@/lib/proyeccion'
import { AvisoDemo, Campo, Segmentado, Selector, Tarjeta } from './ui'

type Datos = { demo: boolean; hoteles: Hotel[]; dias: Dia[] }

type Metrica = 'occ' | 'adr' | 'revpar' | 'ingTot'
const METRICAS: { valor: Metrica; texto: string }[] = [
  { valor: 'occ', texto: 'Ocupación' },
  { valor: 'adr', texto: 'ADR' },
  { valor: 'revpar', texto: 'RevPAR' },
  { valor: 'ingTot', texto: 'Ingresos totales' },
]

export default function Proyecciones({ datos }: { datos: Datos }) {
  const [hotel, setHotel] = useState(datos.hoteles[0]?.id ?? '')
  const moneda = 'usd' as const
  const activos = useMemo(() => new Set(datos.hoteles.filter((h) => h.activo).map((h) => h.id)), [datos.hoteles])
  const [horizonte, setHorizonte] = useState('12')
  const [metrica, setMetrica] = useState<Metrica>('occ')
  const [escenarios, setEscenarios] = useState<Escenario[]>(ESCENARIOS_BASE)
  const [ajustes, setAjustes] = useState<{ tendenciaOcc?: number; crecimientoAdr?: number }>({})
  const cod = 'USD'

  const hist = useMemo(
    () => historicoMensual(datos.dias.filter((d) => (hotel === 'todos' ? activos.has(d.h) : d.h === hotel)), moneda),
    [datos.dias, hotel, moneda, activos],
  )
  const estimados = useMemo(() => estimarSupuestos(hist), [hist])
  const supuestos = {
    ...estimados,
    tendenciaOcc: ajustes.tendenciaOcc ?? estimados.tendenciaOcc,
    crecimientoAdr: ajustes.crecimientoAdr ?? estimados.crecimientoAdr,
  }
  const proy = useMemo(
    () => proyectar(hist, Number(horizonte), escenarios, supuestos),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hist, horizonte, escenarios, supuestos.tendenciaOcc, supuestos.crecimientoAdr],
  )

  const grafico = useMemo(() => {
    const filas = new Map<string, Record<string, number | string>>()
    for (const m of hist.slice(-18)) {
      const v = { occ: m.occ, adr: m.adr, revpar: (m.occ / 100) * m.adr, ingTot: m.ingTot }[metrica]
      filas.set(m.mes, { mes: m.mes, etiqueta: mesCorto(m.mes), real: v })
    }
    // une la línea real con las proyectadas
    const ultimo = hist[hist.length - 1]
    if (ultimo) for (const e of escenarios) filas.get(ultimo.mes)![e.id] = filas.get(ultimo.mes)!.real
    for (const p of proy) {
      const f = filas.get(p.mes) ?? { mes: p.mes, etiqueta: mesCorto(p.mes) }
      f[p.escenario] = p[metrica]
      filas.set(p.mes, f)
    }
    return [...filas.values()]
  }, [hist, proy, metrica, escenarios])

  const totales = escenarios.map((e) => {
    const ps = proy.filter((p) => p.escenario === e.id)
    const noches = ps.reduce((s, p) => s + p.nochesVendidas, 0)
    const ingHab = ps.reduce((s, p) => s + p.ingHab, 0)
    return { e, ingTot: ps.reduce((s, p) => s + p.ingTot, 0), noches, adr: noches ? ingHab / noches : 0,
      occ: ps.length ? ps.reduce((s, p) => s + p.occ, 0) / ps.length : 0 }
  })

  const fmt = (v: number) => (metrica === 'occ' ? pct(v) : dinero(v, cod, metrica === 'ingTot'))
  const editar = (i: number, campo: 'deltaOcc' | 'deltaAdr', v: number) =>
    setEscenarios(escenarios.map((e, j) => (j === i ? { ...e, [campo]: v } : e)))

  return (
    <div className="space-y-4">
      {datos.demo && <AvisoDemo />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo">Proyecciones y escenarios</h1>
          <p className="text-sm text-neutral-500">
            Estacionalidad del mismo mes de años anteriores + tendencia reciente + ajuste de cada escenario.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Selector etiqueta="Hotel" valor={hotel} onChange={(v) => { setHotel(v); setAjustes({}) }}
            opciones={[...datos.hoteles.map((h) => ({ valor: h.id, texto: h.nombre })), { valor: 'todos', texto: 'Cartera completa' }]} />
          <Selector etiqueta="Horizonte" valor={horizonte} onChange={setHorizonte}
            opciones={['3', '6', '12', '18', '24'].map((m) => ({ valor: m, texto: `${m} meses` }))} />
        </div>
      </div>

      {hist.length < 3 ? (
        <Tarjeta><p className="text-sm text-neutral-500">Se necesitan al menos 3 meses de historia para proyectar.</p></Tarjeta>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <Tarjeta titulo="Supuestos" className="lg:col-span-1">
              <div className="space-y-3">
                <Campo etiqueta="Tendencia de ocupación" sufijo="pts/año" paso={0.5} valor={supuestos.tendenciaOcc}
                  onChange={(v) => setAjustes({ ...ajustes, tendenciaOcc: v })}
                  ayuda="Estimada como la mitad de la diferencia de ocupación de los últimos 12 meses contra los 12 anteriores" />
                <Campo etiqueta="Crecimiento de tarifa" sufijo="%/año" paso={0.5}
                  valor={Math.round(supuestos.crecimientoAdr * 1000) / 10}
                  onChange={(v) => setAjustes({ ...ajustes, crecimientoAdr: v / 100 })}
                  ayuda="ADR de los últimos 12 meses contra los 12 anteriores, en la moneda elegida" />
                <p className="text-xs text-neutral-500">
                  Habitaciones disponibles por día: {entero(supuestos.dispDia)} · Otros ingresos:{' '}
                  {pct(supuestos.ratioOtros * 100)} de habitaciones.
                </p>
                <button type="button" onClick={() => setAjustes({})}
                  className="text-xs text-marca underline">Volver a los valores estimados</button>
                <hr className="border-neutral-100" />
                {escenarios.map((e, i) => (
                  <div key={e.id}>
                    <div className="mb-1 text-xs font-semibold" style={{ color: e.color }}>{e.nombre}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Campo etiqueta="Ocupación" sufijo="pts" valor={e.deltaOcc} onChange={(v) => editar(i, 'deltaOcc', v)} />
                      <Campo etiqueta="Tarifa" sufijo="%" valor={e.deltaAdr} onChange={(v) => editar(i, 'deltaAdr', v)} />
                    </div>
                  </div>
                ))}
              </div>
            </Tarjeta>

            <Tarjeta className="lg:col-span-3" titulo="Real vs. proyectado"
              extra={<Segmentado valor={metrica} onChange={setMetrica} opciones={METRICAS} />}>
              <div className="h-80">
                <ResponsiveContainer>
                  <ComposedChart data={grafico} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid stroke="#ececec" vertical={false} />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={70} domain={metrica === 'occ' ? [0, 100] : ['auto', 'auto']}
                      tickFormatter={(v: number) => (metrica === 'occ' ? `${v}%` : dinero(v, cod, true))} />
                    <Tooltip formatter={(v) => fmt(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line dataKey="real" name="Real" stroke="#1c1c1c" strokeWidth={2.5} dot={false} />
                    {escenarios.map((e) => (
                      <Line key={e.id} dataKey={e.id} name={e.nombre} stroke={e.color} strokeWidth={2}
                        strokeDasharray={e.id === 'base' ? undefined : '5 4'} dot={false} />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {totales.map((t) => (
                  <div key={t.e.id} className="rounded-lg border border-neutral-200 p-3">
                    <div className="text-xs font-semibold" style={{ color: t.e.color }}>{t.e.nombre} · {horizonte} meses</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">{dinero(t.ingTot, cod, true)}</div>
                    <div className="text-xs text-neutral-500">
                      Ocupación {pct(t.occ)} · ADR {dinero(t.adr, cod)} · {entero(t.noches)} noches
                    </div>
                  </div>
                ))}
              </div>
            </Tarjeta>
          </div>

          <Tarjeta titulo="Detalle mensual proyectado">
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead className="text-left text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="py-2 pr-4">Mes</th>
                    {escenarios.map((e) => (
                      <th key={e.id} colSpan={3} className="py-2 pr-4 text-center" style={{ color: e.color }}>{e.nombre}</th>
                    ))}
                  </tr>
                  <tr className="text-[11px]">
                    <th />
                    {escenarios.map((e) => (
                      <FragmentoCab key={e.id} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...new Set(proy.map((p) => p.mes))].map((mes) => (
                    <tr key={mes} className="border-t border-neutral-100">
                      <td className="py-1.5 pr-4 font-medium">{mesCorto(mes)}</td>
                      {escenarios.map((e) => {
                        const p = proy.find((x) => x.mes === mes && x.escenario === e.id)!
                        return (
                          <FragmentoFila key={e.id} occ={pct(p.occ)} adr={dinero(p.adr, cod)} ing={dinero(p.ingTot, cod, true)} />
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        </>
      )}
    </div>
  )
}

function FragmentoCab() {
  return (
    <>
      <th className="py-1 pr-2 text-right font-normal">Ocup.</th>
      <th className="py-1 pr-2 text-right font-normal">ADR</th>
      <th className="py-1 pr-4 text-right font-normal">Ingresos</th>
    </>
  )
}

function FragmentoFila({ occ, adr, ing }: { occ: string; adr: string; ing: string }) {
  return (
    <>
      <td className="py-1.5 pr-2 text-right">{occ}</td>
      <td className="py-1.5 pr-2 text-right">{adr}</td>
      <td className="py-1.5 pr-4 text-right">{ing}</td>
    </>
  )
}
