'use client'
import { useEffect, useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { decimal, dinero, entero, pct } from '@/lib/formato'
import {
  ENTRADA_INICIAL, type Entrada, type Resultado, compararModalidades, proyeccionAnual, resultado, sensibilidad,
} from '@/lib/simulador'
import { Campo, Kpi, Segmentado, Tarjeta } from './ui'

export type Referencia = { id: string; nombre: string; habitaciones: number; ocupacion: number; adr: number; aybPct: number; otrosPct: number; moneda: 'USD' | 'ARS' }

const CLAVE_GUARDADO = 'simulador-propuestas-v1'
const PASOS_OCC = [-10, -5, 0, 5, 10]
const PASOS_ADR = [-10, -5, 0, 5, 10]

function leerGuardadas(): Record<string, Entrada> {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_GUARDADO) ?? '{}')
  } catch {
    return {}
  }
}

export default function Simulador({ referencias }: { referencias: Referencia[] }) {
  const [e, setE] = useState<Entrada>(ENTRADA_INICIAL)
  const [guardadas, setGuardadas] = useState<Record<string, Entrada>>({})
  const [metricaSens, setMetricaSens] = useState<'honorarios' | 'noi'>('honorarios')
  useEffect(() => setGuardadas(leerGuardadas()), [])

  const m = e.moneda
  const set = <K extends keyof Entrada>(k: K) => <C extends keyof Entrada[K]>(c: C) => (v: Entrada[K][C]) =>
    setE((x) => ({ ...x, [k]: { ...(x[k] as object), [c]: v } }))
  const op = set('operacion'), co = set('costos'), ct = set('contrato'), me = set('mejora'), al = set('alternativas')

  const anios = useMemo(() => proyeccionAnual(e), [e])
  const modalidades = useMemo(() => compararModalidades(e), [e])
  const sens = useMemo(() => sensibilidad(e, PASOS_OCC, PASOS_ADR, metricaSens), [e, metricaSens])
  const regimen = anios[Math.min(2, anios.length - 1)]
  const a1 = anios[0]
  const honorarios5 = anios.reduce((s, x) => s + x.gestion.honorarios, 0) + e.contrato.feeInicial
  const ganancia5 = anios[anios.length - 1]?.acumuladoDueno ?? 0
  const retornoPorPeso = regimen.gestion.honorarios
    ? (regimen.gestion.noi + regimen.gestion.honorarios - regimen.actual.noi) / regimen.gestion.honorarios
    : 0
  const payback = anios.find((x) => x.acumuladoDueno >= 0)?.anio

  const precargar = (id: string) => {
    const r = referencias.find((x) => x.id === id)
    if (!r) return
    setE((x) => ({
      ...x,
      nombre: r.nombre,
      moneda: r.moneda,
      operacion: { ...x.operacion, habitaciones: r.habitaciones, ocupacion: r.ocupacion, adr: r.adr, aybPct: r.aybPct, otrosPct: r.otrosPct },
    }))
  }
  const guardar = () => {
    const nombre = prompt('Nombre de la propuesta', e.nombre)
    if (!nombre) return
    const nuevas = { ...guardadas, [nombre]: { ...e, nombre } }
    setGuardadas(nuevas)
    try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(nuevas)) } catch { /* sin almacenamiento */ }
  }
  const borrar = (n: string) => {
    const { [n]: _, ...resto } = guardadas
    setGuardadas(resto)
    try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(resto)) } catch { /* sin almacenamiento */ }
  }

  const grafico = anios.map((x) => ({
    anio: `Año ${x.anio}`,
    actual: x.actual.noi,
    gestion: x.gestion.noi,
    honorarios: x.gestion.honorarios,
    acumulado: x.acumuladoDueno,
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo">Simulador de gestión hotelera</h1>
          <p className="text-sm text-neutral-500">
            Cuánto cuesta que operemos el hotel y cuánto gana el propietario con nuestra gestión.
          </p>
        </div>
        <div className="no-imprimir flex flex-wrap items-center gap-2">
          {referencias.length > 0 && (
            <select defaultValue="" onChange={(ev) => { precargar(ev.target.value); ev.target.value = '' }}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
              <option value="" disabled>Precargar con un hotel de la cartera…</option>
              {referencias.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          )}
          {Object.keys(guardadas).length > 0 && (
            <select defaultValue="" onChange={(ev) => { const g = guardadas[ev.target.value]; if (g) setE(g); ev.target.value = '' }}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm">
              <option value="" disabled>Abrir propuesta guardada…</option>
              {Object.keys(guardadas).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
          <button type="button" onClick={guardar} className="rounded-md border border-marca px-3 py-1.5 text-sm text-marca hover:bg-marca-claro">Guardar</button>
          <button type="button" onClick={() => setE(ENTRADA_INICIAL)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100">Reiniciar</button>
          <button type="button" onClick={() => window.print()} className="rounded-md bg-marca px-3 py-1.5 text-sm text-white hover:opacity-90">Imprimir / PDF</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] [&>*]:min-w-0">
        {/* ---------------- Supuestos ---------------- */}
        <div className="no-imprimir space-y-4">
          <Tarjeta titulo="Hotel a operar">
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-xs text-neutral-600">
                Nombre
                <input value={e.nombre} onChange={(ev) => setE({ ...e, nombre: ev.target.value })}
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
              </label>
              <div className="flex items-center justify-between text-xs text-neutral-600">
                Moneda
                <Segmentado valor={e.moneda} onChange={(v) => setE({ ...e, moneda: v })}
                  opciones={[{ valor: 'USD', texto: 'USD' }, { valor: 'ARS', texto: 'ARS' }]} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Campo etiqueta="Habitaciones" valor={e.operacion.habitaciones} onChange={op('habitaciones')} />
                <Campo etiqueta="Días de operación" valor={e.operacion.diasOperacion} onChange={op('diasOperacion')} max={366} />
                <Campo etiqueta="Ocupación actual" sufijo="%" valor={e.operacion.ocupacion} onChange={op('ocupacion')} max={100} />
                <Campo etiqueta="ADR actual" sufijo={m} valor={e.operacion.adr} onChange={op('adr')} />
                <Campo etiqueta="A&B" sufijo="% hab." valor={e.operacion.aybPct} onChange={op('aybPct')}
                  ayuda="Ingresos de alimentos y bebidas como % de los ingresos de habitaciones" />
                <Campo etiqueta="Otros ingresos" sufijo="% hab." valor={e.operacion.otrosPct} onChange={op('otrosPct')} />
              </div>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Estructura de costos">
            <div className="grid grid-cols-2 gap-2">
              <Campo etiqueta="Costo habitaciones" sufijo="%" valor={e.costos.costoHabPct} onChange={co('costoHabPct')}
                ayuda="Housekeeping, recepción, amenities, lavandería, comisiones de canales: % de ingresos de habitaciones" />
              <Campo etiqueta="Costo A&B" sufijo="%" valor={e.costos.costoAybPct} onChange={co('costoAybPct')}
                ayuda="Mercadería + personal de cocina y salón: % de ingresos de A&B" />
              <Campo etiqueta="Costo otros" sufijo="%" valor={e.costos.costoOtrosPct} onChange={co('costoOtrosPct')} />
              <Campo etiqueta="No distribuidos" sufijo="%" valor={e.costos.noDistribuidosPct} onChange={co('noDistribuidosPct')}
                ayuda="Administración, comercial y marketing, mantenimiento y energía: % de ingresos totales" />
              <Campo etiqueta="Cargos fijos / año" sufijo={m} paso={1000} valor={e.costos.fijosAnuales} onChange={co('fijosAnuales')}
                ayuda="Impuestos inmobiliarios, seguros, alquileres a cargo del propietario" />
              <Campo etiqueta="Reserva FF&E" sufijo="%" valor={e.costos.reservaFfePct} onChange={co('reservaFfePct')}
                ayuda="Reserva para reposición de mobiliario y equipos: % de ingresos totales" />
            </div>
          </Tarjeta>

          <Tarjeta titulo="Nuestros honorarios">
            <div className="grid grid-cols-2 gap-2">
              <Campo etiqueta="Fee base" sufijo="% ingresos" paso={0.25} valor={e.contrato.feeBasePct} onChange={ct('feeBasePct')}
                ayuda="Referencia de mercado: 2% a 4% de los ingresos totales" />
              <Campo etiqueta="Fee de incentivo" sufijo="% GOP" paso={0.5} valor={e.contrato.feeIncentivoPct} onChange={ct('feeIncentivoPct')}
                ayuda="Referencia de mercado: 6% a 10% del resultado operativo bruto (GOP)" />
              <Campo etiqueta="Mínimo mensual" sufijo={m} paso={500} valor={e.contrato.feeMinimoMensual} onChange={ct('feeMinimoMensual')} />
              <Campo etiqueta="Tecnología y mkt" sufijo={`${m}/hab/mes`} valor={e.contrato.feeTecnologiaHabMes} onChange={ct('feeTecnologiaHabMes')}
                ayuda="PMS, channel manager, motor de reservas, tableros, marketing digital" />
              <Campo etiqueta="Fee de transición" sufijo={m} paso={1000} valor={e.contrato.feeInicial} onChange={ct('feeInicial')}
                ayuda="Pago único por la toma de la operación" />
            </div>
          </Tarjeta>

          <Tarjeta titulo="Mejora esperada con nuestra gestión">
            <div className="grid grid-cols-2 gap-2">
              <Campo etiqueta="Ocupación" sufijo="pts" valor={e.mejora.deltaOcc} onChange={me('deltaOcc')} />
              <Campo etiqueta="Tarifa (ADR)" sufijo="%" valor={e.mejora.deltaAdr} onChange={me('deltaAdr')} />
              <Campo etiqueta="Ahorro en no distribuidos" sufijo="pts" paso={0.5} valor={e.mejora.ahorroNoDistribuidos} onChange={me('ahorroNoDistribuidos')} />
              <Campo etiqueta="Crecimiento anual" sufijo="%" paso={0.5} valor={e.mejora.crecimientoAnual} onChange={me('crecimientoAnual')}
                ayuda="Aumento anual de tarifas y cargos fijos, en la moneda elegida" />
            </div>
            <div className="mt-3 text-xs text-neutral-600">Rampa de mejora (% alcanzado por año)</div>
            <div className="mt-1 grid grid-cols-5 gap-1">
              {e.mejora.rampa.map((r, i) => (
                <Campo key={i} etiqueta={`A${i + 1}`} valor={r} max={100}
                  onChange={(v) => me('rampa')(e.mejora.rampa.map((x, j) => (j === i ? v : x)))} />
              ))}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Modalidades alternativas">
            <div className="grid grid-cols-2 gap-2">
              <Campo etiqueta="Honorario fijo mensual" sufijo={m} paso={500} valor={e.alternativas.feeFijoMensual} onChange={al('feeFijoMensual')} />
              <Campo etiqueta="Renta fija anual" sufijo={m} paso={5000} valor={e.alternativas.rentaFijaAnual} onChange={al('rentaFijaAnual')} />
              <Campo etiqueta="Renta variable" sufijo="% ingresos" valor={e.alternativas.rentaVariablePct} onChange={al('rentaVariablePct')} />
            </div>
          </Tarjeta>
        </div>

        {/* ---------------- Resultados ---------------- */}
        <div className="min-w-0 space-y-4">
          <div className="hidden print:block">
            <h2 className="text-lg font-semibold">Propuesta de gestión · {e.nombre}</h2>
            <p className="text-sm text-neutral-600">
              {e.operacion.habitaciones} habitaciones · ocupación actual {pct(e.operacion.ocupacion)} · ADR {dinero(e.operacion.adr, m)} ·
              honorarios: {decimal(e.contrato.feeBasePct, 2)}% de ingresos + {decimal(e.contrato.feeIncentivoPct)}% del GOP
              {e.contrato.feeMinimoMensual ? ` (mínimo ${dinero(e.contrato.feeMinimoMensual, m)}/mes)` : ''} ·
              mejora esperada +{decimal(e.mejora.deltaOcc)} pts de ocupación y +{decimal(e.mejora.deltaAdr)}% de tarifa.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi titulo="Honorarios año 1" valor={dinero(a1.gestion.honorarios, m)}
              detalle={`${dinero(a1.gestion.honorarios / 12, m)} por mes`} />
            <Kpi titulo="Por habitación / mes" valor={dinero(regimen.gestion.honorarios / e.operacion.habitaciones / 12, m)}
              detalle={`${pct((100 * regimen.gestion.honorarios) / regimen.gestion.ingTot)} de los ingresos`} />
            <Kpi titulo="Ganancia extra del dueño" valor={dinero(regimen.gananciaDueno, m)}
              detalle={`por año en régimen, neta de honorarios`}
              variacion={{ texto: regimen.actual.noi ? `${pct((100 * regimen.gananciaDueno) / Math.abs(regimen.actual.noi))} sobre hoy` : '', valor: regimen.gananciaDueno }} />
            <Kpi titulo="Retorno de los honorarios" valor={`${decimal(retornoPorPeso, 2)}x`}
              detalle={payback ? `recupera el fee inicial en el año ${payback}` : 'no recupera el fee inicial'}
              variacion={{ texto: 'mejora bruta / honorarios', valor: retornoPorPeso - 1 }} />
          </div>

          <Tarjeta titulo={`Estado de resultados anual (año ${regimen.anio}, en régimen)`}>
            <TablaResultados actual={regimen.actual} gestion={regimen.gestion} moneda={m} />
          </Tarjeta>

          <Tarjeta titulo={`Proyección a ${e.anios} años`}>
            <div className="h-72">
              <ResponsiveContainer>
                <ComposedChart data={grafico} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid stroke="#ececec" vertical={false} />
                  <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => dinero(v, m, true)} />
                  <Tooltip formatter={(v) => dinero(Number(v), m)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="actual" name="Resultado dueño hoy" fill="#a3a3a3" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="gestion" name="Resultado dueño con gestión" fill="#1c1c1c" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="honorarios" name="Nuestros honorarios" fill="#b5121b" radius={[3, 3, 0, 0]} />
                  <Line dataKey="acumulado" name="Ganancia extra acumulada" stroke="#525252" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead className="text-left text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="py-1 pr-3">Año</th>
                    <th className="py-1 pr-3 text-right">Ocupación</th>
                    <th className="py-1 pr-3 text-right">ADR</th>
                    <th className="py-1 pr-3 text-right">Ingresos</th>
                    <th className="py-1 pr-3 text-right">GOP</th>
                    <th className="py-1 pr-3 text-right">Honorarios</th>
                    <th className="py-1 pr-3 text-right">Dueño hoy</th>
                    <th className="py-1 pr-3 text-right">Dueño con gestión</th>
                    <th className="py-1 text-right">Acumulado extra</th>
                  </tr>
                </thead>
                <tbody>
                  {anios.map((x) => {
                    const occ = (100 * x.gestion.nochesVendidas) / x.gestion.nochesDisponibles
                    return (
                      <tr key={x.anio} className="border-t border-neutral-100">
                        <td className="py-1.5 pr-3">{x.anio}</td>
                        <td className="py-1.5 pr-3 text-right">{pct(occ)}</td>
                        <td className="py-1.5 pr-3 text-right">{dinero(x.gestion.ingHab / x.gestion.nochesVendidas, m)}</td>
                        <td className="py-1.5 pr-3 text-right">{dinero(x.gestion.ingTot, m)}</td>
                        <td className="py-1.5 pr-3 text-right">{dinero(x.gestion.gop, m)}</td>
                        <td className="py-1.5 pr-3 text-right">{dinero(x.gestion.honorarios, m)}</td>
                        <td className="py-1.5 pr-3 text-right">{dinero(x.actual.noi, m)}</td>
                        <td className="py-1.5 pr-3 text-right font-medium">{dinero(x.gestion.noi, m)}</td>
                        <td className={`py-1.5 text-right ${x.acumuladoDueno < 0 ? 'text-acento' : 'text-emerald-700'}`}>{dinero(x.acumuladoDueno, m)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-neutral-500">
                Total de honorarios en {e.anios} años (incluye transición): {dinero(honorarios5, m)} · ganancia extra acumulada del
                propietario: {dinero(ganancia5, m)}.
              </p>
            </div>
          </Tarjeta>

          <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
            <Tarjeta titulo="Comparación de modalidades (año en régimen)">
              <div className="overflow-x-auto"><table className="w-full text-sm tabular-nums">
                <thead className="text-left text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="py-1 pr-3">Modalidad</th>
                    <th className="py-1 pr-3 text-right">Operadora</th>
                    <th className="py-1 text-right">Propietario</th>
                  </tr>
                </thead>
                <tbody>
                  {modalidades.map((x) => (
                    <tr key={x.id} className="border-t border-neutral-100 align-top">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-neutral-800">{x.nombre}</div>
                        <div className="text-xs text-neutral-500">Riesgo: {x.riesgo}</div>
                      </td>
                      <td className={`py-2 pr-3 text-right ${x.ingresoOperadora < 0 ? 'text-acento' : ''}`}>{dinero(x.ingresoOperadora, m)}</td>
                      <td className={`py-2 text-right ${x.resultadoDueno < 0 ? 'text-acento' : ''}`}>{dinero(x.resultadoDueno, m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </Tarjeta>

            <Tarjeta titulo="Sensibilidad" extra={
              <Segmentado valor={metricaSens} onChange={setMetricaSens}
                opciones={[{ valor: 'honorarios', texto: 'Honorarios' }, { valor: 'noi', texto: 'Resultado dueño' }]} />
            }>
              <div className="overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="text-neutral-500">
                    <th className="py-1 pr-2 text-left font-normal">Ocup. \ ADR</th>
                    {PASOS_ADR.map((a) => <th key={a} className="py-1 pl-3 text-right font-normal">{a > 0 ? '+' : ''}{a}%</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PASOS_OCC.map((o, i) => (
                    <tr key={o} className="border-t border-neutral-100">
                      <td className="py-1.5 pr-2 text-neutral-500">{o > 0 ? '+' : ''}{o} pts</td>
                      {sens[i].map((v, j) => (
                        <td key={j} className={`py-1.5 pl-3 text-right ${o === 0 && PASOS_ADR[j] === 0 ? 'font-semibold text-marca' : ''} ${v < 0 ? 'text-acento' : ''}`}>
                          {dinero(v, m, true)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <p className="mt-2 text-xs text-neutral-500">Variaciones sobre el escenario con gestión en régimen.</p>
            </Tarjeta>
          </div>

          {Object.keys(guardadas).length > 0 && (
            <Tarjeta titulo="Propuestas guardadas en este navegador" className="no-imprimir">
              <ul className="divide-y divide-neutral-100 text-sm">
                {Object.entries(guardadas).map(([n, g]) => {
                  const r = proyeccionAnual(g)
                  const reg = r[Math.min(2, r.length - 1)]
                  return (
                    <li key={n} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="font-medium">{n}</span>
                      <span className="text-xs text-neutral-500">
                        {g.operacion.habitaciones} hab. · honorarios {dinero(reg.gestion.honorarios, g.moneda)}/año ·
                        extra dueño {dinero(reg.gananciaDueno, g.moneda)}/año
                      </span>
                      <span className="flex gap-2">
                        <button type="button" className="text-marca underline" onClick={() => setE(g)}>Abrir</button>
                        <button type="button" className="text-acento underline" onClick={() => borrar(n)}>Borrar</button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Tarjeta>
          )}
        </div>
      </div>
    </div>
  )
}

function TablaResultados({ actual, gestion, moneda }: { actual: Resultado; gestion: Resultado; moneda: 'USD' | 'ARS' }) {
  // cuarto elemento: fila de total; quinto: es un costo (subir es malo)
  const filas: [string, keyof Resultado, 'dinero' | 'pct' | 'entero', boolean?, boolean?][] = [
    ['Noches vendidas', 'nochesVendidas', 'entero'],
    ['RevPAR', 'revpar', 'dinero'],
    ['Ingresos de habitaciones', 'ingHab', 'dinero'],
    ['Ingresos de A&B', 'ingAyb', 'dinero'],
    ['Otros ingresos', 'ingOtros', 'dinero'],
    ['Ingresos totales', 'ingTot', 'dinero', true],
    ['Costos departamentales', 'costosDepartamentales', 'dinero', false, true],
    ['Gastos no distribuidos', 'noDistribuidos', 'dinero', false, true],
    ['Resultado operativo bruto (GOP)', 'gop', 'dinero', true],
    ['Margen GOP', 'gopMargen', 'pct'],
    ['Fee base', 'feeBase', 'dinero', false, true],
    ['Fee de incentivo', 'feeIncentivo', 'dinero', false, true],
    ['Tecnología y marketing', 'feeTecnologia', 'dinero', false, true],
    ['Ajuste a mínimo', 'ajusteMinimo', 'dinero', false, true],
    ['Cargos fijos del propietario', 'fijos', 'dinero', false, true],
    ['Reserva FF&E', 'reservaFfe', 'dinero', false, true],
    ['Resultado neto del propietario (NOI)', 'noi', 'dinero', true],
  ]
  const f = (v: number, t: 'dinero' | 'pct' | 'entero') => (t === 'pct' ? pct(v) : t === 'entero' ? entero(v) : dinero(v, moneda))
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead className="text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="py-1 pr-3">Concepto</th>
            <th className="py-1 pr-3 text-right">Hoy</th>
            <th className="py-1 pr-3 text-right">Con nuestra gestión</th>
            <th className="py-1 text-right">Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([nombre, k, t, total, costo]) => {
            const x = actual[k], y = gestion[k]
            if (!x && !y) return null
            const dif = y - x
            const mejor = costo ? dif < 0 : dif > 0
            return (
              <tr key={k} className={`border-t border-neutral-100 ${total ? 'font-semibold' : ''}`}>
                <td className="py-1.5 pr-3">{nombre}</td>
                <td className="py-1.5 pr-3 text-right">{f(x, t)}</td>
                <td className="py-1.5 pr-3 text-right">{f(y, t)}</td>
                <td className={`py-1.5 text-right ${dif === 0 ? 'text-neutral-400' : mejor ? 'text-emerald-700' : 'text-acento'}`}>
                  {t === 'pct' ? `${dif > 0 ? '+' : ''}${decimal(dif)} pts` : f(dif, t)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
