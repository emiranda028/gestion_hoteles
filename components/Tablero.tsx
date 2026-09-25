'use client'
import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { datosTablero } from '@/lib/datos'
import FlashDelDia from './FlashDelDia'
import {
  type Moneda, agregar, agrupar, anioAnterior, filtrar, mesDe, serie, sumarDias, variacion,
} from '@/lib/kpi'
import {
  decimal, dinero, entero, fechaCorta, fechaLarga, mesCorto, pct, variacionTexto,
} from '@/lib/formato'
import { AvisoDemo, Kpi, Segmentado, Selector, Tarjeta } from './ui'

type Periodo = '30d' | 'mes' | 'mesAnt' | 'anio' | '12m' | 'todo' | 'custom'

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: '30d', texto: 'Últimos 30 días' },
  { valor: 'mes', texto: 'Mes en curso' },
  { valor: 'mesAnt', texto: 'Mes anterior' },
  { valor: 'anio', texto: 'Año a la fecha' },
  { valor: '12m', texto: 'Últimos 12 meses' },
  { valor: 'todo', texto: 'Todo el histórico' },
  { valor: 'custom', texto: 'Personalizado' },
]

function rango(p: Periodo, hasta: string, desdeDatos: string, custom: [string, string]): [string, string] {
  const mes = hasta.slice(0, 7)
  switch (p) {
    case '30d': return [sumarDias(hasta, -29), hasta]
    case 'mes': return [`${mes}-01`, hasta]
    case 'mesAnt': {
      const finAnt = sumarDias(`${mes}-01`, -1)
      return [`${finAnt.slice(0, 7)}-01`, finAnt]
    }
    case 'anio': return [`${hasta.slice(0, 4)}-01-01`, hasta]
    case '12m': return [sumarDias(hasta, -364), hasta]
    case 'todo': return [desdeDatos, hasta]
    case 'custom': return custom
  }
}

const NIVELES = ['Ambassador Elite (AMB)', 'Titanium Elite (TTM)', 'Platinum Elite (PLT)', 'Gold Elite (GLD)', 'Silver Elite (SLR)', 'Member (MRD)']
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const COLORES = { hab: '#1c1c1c', ayb: '#b5121b', otros: '#a3a3a3', occ: '#1c1c1c', adr: '#b5121b', ant: '#a3a3a3' }

export default function Tablero({ datos }: { datos: ReturnType<typeof datosTablero> }) {
  const [hotel, setHotel] = useState<string>('todos')
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [custom, setCustom] = useState<[string, string]>([sumarDias(datos.hasta, -29), datos.hasta])
  const [moneda, setMoneda] = useState<Moneda>('usd')
  const cod = moneda === 'usd' ? 'USD' : 'ARS'

  const [desde, hasta] = rango(periodo, datos.hasta, datos.desde, custom)
  // "Todos" = hoteles vigentes (Maitei queda solo como histórico, seleccionándolo aparte)
  const filtroHoteles = useMemo(
    () => new Set(hotel === 'todos' ? datos.hoteles.filter((h) => h.activo).map((h) => h.id) : [hotel]),
    [hotel, datos.hoteles],
  )

  const actual = useMemo(() => filtrar(datos.dias, desde, hasta, filtroHoteles), [datos.dias, desde, hasta, filtroHoteles])
  const previo = useMemo(
    () => filtrar(datos.dias, anioAnterior(desde), anioAnterior(hasta), filtroHoteles),
    [datos.dias, desde, hasta, filtroHoteles],
  )
  const a = agregar(actual, moneda)
  const p = agregar(previo, moneda)
  const hayPrevio = previo.length > 0

  const diario = actual.length > 0 && a.dias <= 95
  const evolucion = useMemo(() => {
    const clave = diario ? (d: { f: string }) => d.f : (d: { f: string }) => mesDe(d.f)
    const prev = new Map(serie(previo, moneda, clave).map((x) => [x.clave, x]))
    const claveAnt = (k: string) => (diario ? anioAnterior(k) : `${Number(k.slice(0, 4)) - 1}${k.slice(4)}`)
    return serie(actual, moneda, clave).map((x) => ({
      etiqueta: diario ? fechaCorta(x.clave) : mesCorto(x.clave),
      occ: x.occ,
      adr: x.adr,
      occAnt: prev.get(claveAnt(x.clave))?.occ,
      hab: x.ingHab,
      ayb: x.ingAyb,
      otros: x.ingOtros,
    }))
  }, [actual, previo, moneda, diario])

  const porHotel = useMemo(() => {
    const prev = agrupar(previo, (d) => d.h)
    return [...agrupar(actual, (d) => d.h).entries()].map(([h, ds]) => {
      const x = agregar(ds, moneda)
      const y = agregar(prev.get(h) ?? [], moneda)
      return { id: h, nombre: datos.hoteles.find((o) => o.id === h)?.nombre ?? h, x, y }
    }).sort((m, n) => n.x.ingTot - m.x.ingTot)
  }, [actual, previo, moneda, datos.hoteles])

  const semana = useMemo(() => {
    const g = agrupar(actual, (d) => String(new Date(d.f + 'T12:00:00Z').getUTCDay()))
    return [1, 2, 3, 4, 5, 6, 0].map((i) => {
      const x = agregar(g.get(String(i)) ?? [], moneda)
      return { dia: DIAS_SEMANA[i], occ: x.occ, adr: x.adr }
    })
  }, [actual, moneda])

  const bonvoy = useMemo(() => {
    const mDesde = desde.slice(0, 7), mHasta = hasta.slice(0, 7)
    const tot = new Map<string, number>()
    for (const r of datos.bonvoy) {
      if (r.mes < mDesde || r.mes > mHasta || !filtroHoteles.has(r.h)) continue
      tot.set(r.nivel, (tot.get(r.nivel) ?? 0) + r.n)
    }
    const lista = NIVELES.filter((n) => tot.has(n)).map((nivel) => ({ nivel, n: tot.get(nivel)! }))
    return { lista, total: lista.reduce((s, x) => s + x.n, 0) }
  }, [datos.bonvoy, desde, hasta, filtroHoteles])

  const paises = useMemo(() => {
    const datosH = datos.paises.filter((r) => filtroHoteles.has(r.h))
    if (!datosH.length) return null
    const ultimo = datosH.reduce((m, r) => (r.mes > m ? r.mes : m), '')
    let d0 = desde.slice(0, 7), d1 = hasta.slice(0, 7)
    let aviso = ''
    if (!datosH.some((r) => r.mes >= d0 && r.mes <= d1)) {
      // la planilla de Drive se actualiza con atraso: se muestran los últimos 12 meses informados
      d1 = ultimo
      d0 = `${Number(ultimo.slice(0, 4)) - 1}-${String(Number(ultimo.slice(5)) % 12 + 1).padStart(2, '0')}`
      if (ultimo.slice(5) === '12') d0 = `${ultimo.slice(0, 4)}-01`
      aviso = `El período elegido todavía no está en la planilla; se muestran los 12 meses hasta ${mesCorto(ultimo)}.`
    }
    const ant = (m: string) => `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`
    const act = new Map<string, number>(), prev = new Map<string, number>(), cont = new Map<string, number>()
    for (const r of datosH) {
      if (r.mes >= d0 && r.mes <= d1) {
        act.set(r.pais, (act.get(r.pais) ?? 0) + r.n)
        cont.set(r.continente, (cont.get(r.continente) ?? 0) + r.n)
      } else if (r.mes >= ant(d0) && r.mes <= ant(d1)) prev.set(r.pais, (prev.get(r.pais) ?? 0) + r.n)
    }
    const total = [...act.values()].reduce((a, b) => a + b, 0)
    const lista = [...act].sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([pais, n]) => ({ pais, n, share: total ? (100 * n) / total : 0, varAnual: variacion(n, prev.get(pais) ?? 0) }))
    const continentes = [...cont].sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ c, share: total ? (100 * n) / total : 0 }))
    return { lista, continentes, total, d0, d1, aviso }
  }, [datos.paises, filtroHoteles, desde, hasta])

  const varPct = (x: number, y: number) => ({
    texto: hayPrevio ? `${variacionTexto(variacion(x, y))} vs año ant.` : 'sin año anterior',
    valor: hayPrevio ? variacion(x, y) : null,
  })

  return (
    <div className="space-y-4">
      {datos.demo && <AvisoDemo />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo">Tablero de gestión</h1>
          <p className="text-sm text-neutral-500">
            {fechaLarga(desde)} al {fechaLarga(hasta)} · datos hasta el {fechaLarga(datos.hasta)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Selector
            etiqueta="Hotel"
            valor={hotel}
            onChange={setHotel}
            opciones={[{ valor: 'todos', texto: 'Todos los hoteles' }, ...datos.hoteles.map((h) => ({ valor: h.id, texto: h.nombre }))]}
          />
          <Selector etiqueta="Período" valor={periodo} onChange={setPeriodo} opciones={PERIODOS} />
          {periodo === 'custom' && (
            <div className="flex gap-2">
              {[0, 1].map((i) => (
                <input
                  key={i}
                  type="date"
                  value={custom[i]}
                  min={datos.desde}
                  max={datos.hasta}
                  onChange={(e) => setCustom(i === 0 ? [e.target.value, custom[1]] : [custom[0], e.target.value])}
                  className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                />
              ))}
            </div>
          )}
          <Segmentado
            valor={moneda}
            onChange={setMoneda}
            opciones={[{ valor: 'usd', texto: 'USD' }, { valor: 'ars', texto: 'ARS (BNA)' }]}
          />
        </div>
      </div>

      <FlashDelDia flash={datos.flash} hoteles={datos.hoteles} />

      {actual.length === 0 ? (
        <Tarjeta><p className="text-sm text-neutral-500">No hay datos para el período elegido.</p></Tarjeta>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi titulo="Ocupación" valor={pct(a.occ)}
              variacion={{ texto: hayPrevio ? `${variacionTexto(a.occ - p.occ, true)} vs año ant.` : 'sin año anterior', valor: hayPrevio ? a.occ - p.occ : null }} />
            <Kpi titulo="Tarifa promedio (ADR)" valor={dinero(a.adr, cod)} variacion={varPct(a.adr, p.adr)} />
            <Kpi titulo="RevPAR" valor={dinero(a.revpar, cod)} variacion={varPct(a.revpar, p.revpar)} />
            <Kpi titulo="Ingresos totales" valor={dinero(a.ingTot, cod, true)} variacion={varPct(a.ingTot, p.ingTot)} />
            <Kpi titulo="Noches vendidas" valor={entero(a.ocup)} variacion={varPct(a.ocup, p.ocup)}
              detalle={`de ${entero(a.disp)}`} />
            <Kpi titulo="Huéspedes" valor={entero(a.pax)} variacion={varPct(a.pax, p.pax)}
              detalle={a.ocup ? `${decimal(a.pax / a.ocup)} por hab.` : undefined} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Tarjeta titulo={`Ocupación y tarifa ${diario ? 'diaria' : 'mensual'}`} className="lg:col-span-2">
              <div className="h-72">
                <ResponsiveContainer>
                  <ComposedChart data={evolucion} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid stroke="#ececec" vertical={false} />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} minTickGap={16} />
                    <YAxis yAxisId="o" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} width={40} />
                    <YAxis yAxisId="t" orientation="right" tick={{ fontSize: 11 }} width={60}
                      tickFormatter={(v: number) => dinero(v, cod, true)} />
                    <Tooltip formatter={(v, n) => (n === 'Tarifa (ADR)' ? dinero(Number(v), cod) : pct(Number(v)))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="o" dataKey="occ" name="Ocupación" fill={COLORES.occ} radius={[3, 3, 0, 0]} />
                    {hayPrevio && (
                      <Line yAxisId="o" dataKey="occAnt" name="Ocupación año ant." stroke={COLORES.ant}
                        strokeDasharray="4 3" dot={false} strokeWidth={2} />
                    )}
                    <Line yAxisId="t" dataKey="adr" name="Tarifa (ADR)" stroke={COLORES.adr} dot={false} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Tarjeta>

            <Tarjeta titulo="Ocupación por día de la semana">
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={semana} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid stroke="#ececec" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} width={40} />
                    <Tooltip formatter={(v) => pct(Number(v))} />
                    <Bar dataKey="occ" name="Ocupación" fill={COLORES.occ} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Tarjeta>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Tarjeta titulo="Composición de ingresos" className="lg:col-span-2">
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={evolucion} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid stroke="#ececec" vertical={false} />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} minTickGap={16} />
                    <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => dinero(v, cod, true)} />
                    <Tooltip formatter={(v) => dinero(Number(v), cod)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="hab" stackId="i" name="Habitaciones" fill={COLORES.hab} />
                    <Bar dataKey="ayb" stackId="i" name="A&B" fill={COLORES.ayb} />
                    <Bar dataKey="otros" stackId="i" name="Otros" fill={COLORES.otros} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Tarjeta>

            <Tarjeta titulo="Llegadas de socios Bonvoy">
              {bonvoy.total === 0 ? (
                <p className="text-sm text-neutral-500">Sin llegadas Bonvoy informadas en el período.</p>
              ) : (
                <ul className="space-y-2">
                  {bonvoy.lista.map((x) => {
                    const share = (100 * x.n) / bonvoy.total
                    return (
                      <li key={x.nivel} className="text-sm">
                        <div className="flex justify-between">
                          <span>{x.nivel}</span>
                          <span className="tabular-nums text-neutral-500">{entero(x.n)} · {pct(share)}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded bg-neutral-100">
                          <div className="h-1.5 rounded bg-marca" style={{ width: `${share}%` }} />
                        </div>
                      </li>
                    )
                  })}
                  <li className="pt-1 text-xs text-neutral-500">{entero(bonvoy.total)} llegadas de socios en el período</li>
                </ul>
              )}
            </Tarjeta>
          </div>

          {paises && (
            <Tarjeta titulo={`Huéspedes por país de origen · Marriott Buenos Aires · ${mesCorto(paises.d0)} a ${mesCorto(paises.d1)}`}
              extra={<span className="text-xs text-neutral-500">{entero(paises.total)} huéspedes</span>}>
              {paises.aviso && <p className="mb-3 text-xs text-neutral-500">{paises.aviso}</p>}
              <div className="grid gap-6 lg:grid-cols-3">
                <ul className="space-y-2 lg:col-span-2">
                  {paises.lista.map((x) => (
                    <li key={x.pais} className="text-sm">
                      <div className="flex justify-between gap-2">
                        <span>{x.pais}</span>
                        <span className="tabular-nums text-neutral-500">
                          {entero(x.n)} · {pct(x.share)}
                          <span className={`ml-2 inline-block w-16 text-right ${x.varAnual === null ? '' : x.varAnual >= 0 ? 'text-emerald-700' : 'text-acento'}`}>
                            {variacionTexto(x.varAnual)}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 bg-neutral-100">
                        <div className="h-1.5 bg-marca" style={{ width: `${x.share}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Por continente</h3>
                  <ul className="space-y-1.5 text-sm">
                    {paises.continentes.map((x) => (
                      <li key={x.c} className="flex justify-between border-b border-neutral-100 pb-1">
                        <span>{x.c}</span><span className="tabular-nums">{pct(x.share)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-neutral-500">Variación contra los mismos meses del año anterior.</p>
                </div>
              </div>
            </Tarjeta>
          )}

          <Tarjeta titulo="Comparativo por hotel">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="py-2 pr-4">Hotel</th>
                    <th className="py-2 pr-4 text-right">Ocupación</th>
                    <th className="py-2 pr-4 text-right">Var.</th>
                    <th className="py-2 pr-4 text-right">ADR</th>
                    <th className="py-2 pr-4 text-right">Var.</th>
                    <th className="py-2 pr-4 text-right">RevPAR</th>
                    <th className="py-2 pr-4 text-right">Ingresos totales</th>
                    <th className="py-2 text-right">Var.</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {porHotel.map(({ id, nombre, x, y }) => (
                    <tr key={id} className="border-t border-neutral-100">
                      <td className="py-2 pr-4 font-medium text-neutral-800">{nombre}</td>
                      <td className="py-2 pr-4 text-right">{pct(x.occ)}</td>
                      <td className="py-2 pr-4 text-right text-neutral-500">{y.disp ? variacionTexto(x.occ - y.occ, true) : '—'}</td>
                      <td className="py-2 pr-4 text-right">{dinero(x.adr, cod)}</td>
                      <td className="py-2 pr-4 text-right text-neutral-500">{variacionTexto(variacion(x.adr, y.adr))}</td>
                      <td className="py-2 pr-4 text-right">{dinero(x.revpar, cod)}</td>
                      <td className="py-2 pr-4 text-right">{dinero(x.ingTot, cod)}</td>
                      <td className="py-2 text-right text-neutral-500">{variacionTexto(variacion(x.ingTot, y.ingTot))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>
          {moneda === 'ars' && (
            <p className="text-xs text-neutral-500">
              Montos en pesos convertidos con el dólar BNA vendedor de cada día. Las variaciones en pesos incluyen inflación.
            </p>
          )}
        </>
      )}
    </div>
  )
}
