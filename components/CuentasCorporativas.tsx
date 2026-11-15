'use client'
import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CorpMes, TarifaCorp } from '@/lib/datos'
import { dinero, entero, pct, variacionTexto } from '@/lib/formato'
import { COLORES } from './colores'
import { AvisoDemo, Kpi, Selector, Tarjeta } from './ui'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Palabras que no identifican a la empresa: se saltean para unir la producción con la tarifa del RFP
const GENERICAS = new Set(['THE', 'LA', 'EL', 'LOS', 'LAS', 'BANCO', 'BANK', 'GRUPO', 'GROUP', 'GOBIERNO', 'MINISTERIO', 'EMBAJADA',
  'UNIVERSIDAD', 'FUNDACION', 'ASOCIACION', 'INSTITUTO', 'LABORATORIO', 'LABORATORIOS', 'CAMARA', 'FEDERACION', 'AMERICAN',
  'GENERAL', 'NATIONAL', 'INTERNATIONAL', 'GLOBAL', 'SAN', 'SANTA', 'NEW', 'CIA', 'COMPANIA'])
export function claveEmpresa(nombre: string) {
  const p = nombre.normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(' ')
  const i = p.findIndex((x) => !GENERICAS.has(x))
  return i < 0 ? p.join(' ') : i === 0 ? p[0] : p.slice(0, i + 1).join(' ')
}

type Suma = { rn: number; rev: number }
const sumar = (xs: { rn: number; rev: number }[]): Suma => xs.reduce((s, x) => ({ rn: s.rn + x.rn, rev: s.rev + x.rev }), { rn: 0, rev: 0 })
const adr = (s: Suma) => (s.rn ? s.rev / s.rn : 0)
const variacion = (a: number, b: number) => (b ? (a - b) / b : null)

type Orden = 'rev' | 'rn' | 'adr' | 'var'

export default function CuentasCorporativas({ demo, filas, tarifas, ocupadasHotel }: {
  demo: boolean; filas: CorpMes[]; tarifas: TarifaCorp[]; ocupadasHotel: Record<string, number>
}) {
  const ultimoMes = filas.reduce((m, r) => (r.mes > m ? r.mes : m), '')
  const anios = [...new Set(filas.map((r) => r.mes.slice(0, 4)))].sort().reverse()
  const [anio, setAnio] = useState(ultimoMes.slice(0, 4))
  const mesesDelAnio = [...new Set(filas.filter((r) => r.mes.startsWith(anio)).map((r) => Number(r.mes.slice(5, 7))))].sort((a, b) => a - b)
  const [hastaSel, setHastaSel] = useState('')
  const hasta = mesesDelAnio.includes(Number(hastaSel)) ? Number(hastaSel) : mesesDelAnio[mesesDelAnio.length - 1] ?? 12
  const [modo, setModo] = useState<'acumulado' | 'mes'>('acumulado')
  const [ejecutivo, setEjecutivo] = useState('todos')
  const [rubro, setRubro] = useState('todos')
  const [buscar, setBuscar] = useState('')
  const [orden, setOrden] = useState<Orden>('rev')
  const [todas, setTodas] = useState(false)

  // rubro y ejecutivo vigentes de cada cuenta: el último informado
  const actual = useMemo(() => {
    const m = new Map<string, { rubro: string; ejecutivo: string }>()
    for (const r of [...filas].sort((a, b) => a.mes.localeCompare(b.mes))) {
      const x = m.get(r.cuenta) ?? { rubro: '', ejecutivo: '' }
      m.set(r.cuenta, { rubro: r.rubro || x.rubro, ejecutivo: r.ejecutivo || x.ejecutivo })
    }
    return m
  }, [filas])
  const rubroDe = (c: string) => actual.get(c)?.rubro || 'Sin rubro'
  const ejecDe = (c: string) => actual.get(c)?.ejecutivo || 'Sin asignar'

  const enPeriodo = (mes: string, a: string) => {
    const m = Number(mes.slice(5, 7))
    return mes.startsWith(a) && (modo === 'mes' ? m === hasta : m <= hasta)
  }
  const anioAnt = String(Number(anio) - 1)
  const pasaFiltros = (r: CorpMes) => (ejecutivo === 'todos' || ejecDe(r.cuenta) === ejecutivo) && (rubro === 'todos' || rubroDe(r.cuenta) === rubro)
  const act = filas.filter((r) => enPeriodo(r.mes, anio) && pasaFiltros(r))
  const ant = filas.filter((r) => enPeriodo(r.mes, anioAnt) && pasaFiltros(r))
  const tA = sumar(act), tB = sumar(ant)
  const mesesPeriodo = modo === 'mes' ? [hasta] : Array.from({ length: hasta }, (_, i) => i + 1)
  const ocupadas = mesesPeriodo.reduce((s, m) => s + (ocupadasHotel[`${anio}-${String(m).padStart(2, '0')}`] ?? 0), 0)
  const hayHotel = mesesPeriodo.every((m) => ocupadasHotel[`${anio}-${String(m).padStart(2, '0')}`])

  // tarifas RFP del año elegido, unidas a la producción por empresa
  const tarifasAnio = tarifas.filter((t) => t.anio === Number(anio))
  const tarifaPorClave = new Map(tarifasAnio.map((t) => [claveEmpresa(t.cuenta), t]))

  const cuentas = (() => {
    const m = new Map<string, { cuenta: string; a: Suma; b: Suma }>()
    for (const [lista, k] of [[act, 'a'], [ant, 'b']] as const) {
      for (const r of lista) {
        const x = m.get(r.cuenta) ?? { cuenta: r.cuenta, a: { rn: 0, rev: 0 }, b: { rn: 0, rev: 0 } }
        x[k] = { rn: x[k].rn + r.rn, rev: x[k].rev + r.rev }
        m.set(r.cuenta, x)
      }
    }
    return [...m.values()]
  })()
  const texto = buscar.trim().toUpperCase()
  const ranking = cuentas
    .filter((x) => x.a.rn > 0 && (!texto || x.cuenta.includes(texto)))
    .sort((x, y) => orden === 'rn' ? y.a.rn - x.a.rn : orden === 'adr' ? adr(y.a) - adr(x.a)
      : orden === 'var' ? (variacion(y.a.rn, y.b.rn) ?? -Infinity) - (variacion(x.a.rn, x.b.rn) ?? -Infinity) : y.a.rev - x.a.rev)
  const bajaron = cuentas.filter((x) => x.b.rn >= 10 && x.a.rn < x.b.rn).sort((x, y) => (y.b.rn - y.a.rn) - (x.b.rn - x.a.rn)).slice(0, 8)
  const conProduccion = new Set(cuentas.filter((x) => x.a.rn > 0).map((x) => claveEmpresa(x.cuenta)))
  const sinProduccion = tarifasAnio.filter((t) => !conProduccion.has(claveEmpresa(t.cuenta)))

  const agrupar = (clave: (c: string) => string) => {
    const m = new Map<string, { nombre: string; a: Suma; b: Suma; n: Set<string> }>()
    for (const [lista, k] of [[act, 'a'], [ant, 'b']] as const) {
      for (const r of lista) {
        const g = clave(r.cuenta)
        const x = m.get(g) ?? { nombre: g, a: { rn: 0, rev: 0 }, b: { rn: 0, rev: 0 }, n: new Set<string>() }
        x[k] = { rn: x[k].rn + r.rn, rev: x[k].rev + r.rev }
        if (k === 'a') x.n.add(r.cuenta)
        m.set(g, x)
      }
    }
    return [...m.values()].filter((x) => x.a.rn > 0).sort((x, y) => y.a.rev - x.a.rev)
  }
  const porEjecutivo = agrupar(ejecDe)
  const porRubro = (() => {
    const todos = agrupar(rubroDe)
    if (todos.length <= 13) return todos
    const resto = todos.slice(12)
    return [...todos.slice(0, 12), {
      nombre: `Otros (${resto.length} rubros)`, a: sumar(resto.map((x) => x.a)), b: sumar(resto.map((x) => x.b)),
      n: new Set(resto.flatMap((x) => [...x.n])),
    }]
  })()

  const serie = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0')
    const de = (a: string) => sumar(filas.filter((r) => r.mes === `${a}-${m}` && pasaFiltros(r)))
    const x = de(anio), y = de(anioAnt)
    return { mes: CORTO[i], actual: x.rn || null, anterior: y.rn || null, adr: x.rn ? Math.round(adr(x)) : null }
  })

  const ejecutivos = [...new Set([...actual.values()].map((x) => x.ejecutivo || 'Sin asignar'))].sort()
  const rubros = [...new Set([...actual.values()].map((x) => x.rubro || 'Sin rubro'))].sort()
  const periodoTexto = modo === 'mes' ? `${MESES[hasta - 1]} ${anio}` : `enero a ${MESES[hasta - 1].toLowerCase()} ${anio}`

  if (!filas.length) {
    return (
      <div className="space-y-4">
        <h1 className="titulo">Cuentas corporativas</h1>
        <Tarjeta><p className="text-sm text-neutral-500">Todavía no se cargó la planilla de cuentas corporativas.</p></Tarjeta>
      </div>
    )
  }

  const Var = ({ a, b }: { a: number; b: number }) => {
    const v = variacion(a, b)
    return <span className={v === null ? 'text-neutral-400' : v >= 0 ? 'text-emerald-700' : 'text-acento'}>{v === null ? 'nueva' : variacionTexto(v)}</span>
  }
  const TablaGrupo = ({ titulo, datos }: { titulo: string; datos: ReturnType<typeof agrupar> }) => (
    <Tarjeta titulo={titulo}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="border-b-2 border-marca text-right text-[11px] uppercase tracking-wide text-neutral-500">
            <tr><th className="py-2 pr-2 text-left">{titulo.replace('Por ', '')}</th><th className="pr-2">Cuentas</th><th className="pr-2">Noches</th><th className="pr-2">ADR</th><th className="pr-2">Ingresos</th><th>vs {anioAnt}</th></tr>
          </thead>
          <tbody>
            {datos.map((g) => (
              <tr key={g.nombre} className="border-b border-neutral-100 text-right">
                <td className="py-1.5 pr-2 text-left capitalize">{g.nombre.toLowerCase()}</td>
                <td className="pr-2">{g.n.size}</td><td className="pr-2">{entero(g.a.rn)}</td><td className="pr-2">{dinero(adr(g.a), 'USD')}</td>
                <td className="pr-2">{dinero(g.a.rev, 'USD')}</td><td className="text-xs"><Var a={g.a.rn} b={g.b.rn} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  )

  return (
    <div className="space-y-5">
      {demo && <AvisoDemo />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo">Cuentas corporativas</h1>
          <p className="text-sm text-neutral-500">Marriott Buenos Aires · producción de las empresas con tarifa negociada · {periodoTexto} contra el mismo período de {anioAnt} · USD</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Selector etiqueta="Año" valor={anio} onChange={(a) => { setAnio(a); setHastaSel('') }} opciones={anios.map((a) => ({ valor: a, texto: a }))} />
          <Selector etiqueta="Período" valor={modo} onChange={setModo}
            opciones={[{ valor: 'acumulado', texto: 'Acumulado del año' }, { valor: 'mes', texto: 'Solo el mes' }]} />
          <Selector etiqueta={modo === 'mes' ? 'Mes' : 'Hasta'} valor={String(hasta)} onChange={setHastaSel}
            opciones={mesesDelAnio.map((m) => ({ valor: String(m), texto: MESES[m - 1] }))} />
          <Selector etiqueta="Ejecutivo" valor={ejecutivo} onChange={setEjecutivo}
            opciones={[{ valor: 'todos', texto: 'Todos' }, ...ejecutivos.map((e) => ({ valor: e, texto: e }))]} />
          <Selector etiqueta="Rubro" valor={rubro} onChange={setRubro}
            opciones={[{ valor: 'todos', texto: 'Todos' }, ...rubros.map((r) => ({ valor: r, texto: r.charAt(0) + r.slice(1).toLowerCase() }))]} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi titulo="Noches" valor={entero(tA.rn)} variacion={{ texto: variacionTexto(variacion(tA.rn, tB.rn)), valor: variacion(tA.rn, tB.rn) }} detalle={`${anioAnt}: ${entero(tB.rn)}`} />
        <Kpi titulo="ADR" valor={dinero(adr(tA), 'USD')} variacion={{ texto: variacionTexto(variacion(adr(tA), adr(tB))), valor: variacion(adr(tA), adr(tB)) }} detalle={`${anioAnt}: ${dinero(adr(tB), 'USD')}`} />
        <Kpi titulo="Ingresos" valor={dinero(tA.rev, 'USD', true)} variacion={{ texto: variacionTexto(variacion(tA.rev, tB.rev)), valor: variacion(tA.rev, tB.rev) }} detalle={`${anioAnt}: ${dinero(tB.rev, 'USD', true)}`} />
        <Kpi titulo="Cuentas activas" valor={entero(new Set(act.map((r) => r.cuenta)).size)} detalle={`${anioAnt}: ${entero(new Set(ant.map((r) => r.cuenta)).size)}`} />
        <Kpi titulo="Peso en el hotel" valor={hayHotel && ocupadas ? pct((100 * tA.rn) / ocupadas) : '—'}
          detalle={hayHotel && ocupadas ? `de ${entero(ocupadas)} noches ocupadas` : 'sin datos del hotel para el período'} />
      </div>

      <Tarjeta titulo={`Noches por mes · ${anio} contra ${anioAnt}`}>
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={serie} margin={{ left: 0, right: 8 }}>
              <CartesianGrid stroke={COLORES.grilla} vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="n" tick={{ fontSize: 11 }} width={44} />
              <YAxis yAxisId="a" orientation="right" tick={{ fontSize: 10 }} width={64} tickFormatter={(v: number) => `US$ ${v}`} />
              <Tooltip formatter={(v, n) => (n === 'ADR' ? dinero(Number(v), 'USD') : entero(Number(v)))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="n" dataKey="actual" name={`Noches ${anio}`} fill={COLORES.principal} radius={[3, 3, 0, 0]} />
              <Line yAxisId="n" dataKey="anterior" name={`Noches ${anioAnt}`} stroke={COLORES.gris} strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Line yAxisId="a" dataKey="adr" name="ADR" stroke={COLORES.acento} strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Tarjeta>

      <Tarjeta titulo={`Ranking de cuentas · ${periodoTexto}`}
        extra={<div className="flex flex-wrap items-center gap-2">
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar empresa…"
            className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm" />
          <Selector valor={orden} onChange={setOrden}
            opciones={[{ valor: 'rev', texto: 'Por ingresos' }, { valor: 'rn', texto: 'Por noches' }, { valor: 'adr', texto: 'Por ADR' }, { valor: 'var', texto: 'Por crecimiento' }]} />
        </div>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="border-b-2 border-marca text-right text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-2 pr-2 text-left">#</th><th className="pr-2 text-left">Cuenta</th><th className="pr-2 text-left">Rubro</th><th className="pr-2 text-left">Ejecutivo</th>
                <th className="pr-2">Noches</th><th className="pr-2">vs {anioAnt}</th><th className="pr-2">ADR</th><th className="pr-2">Tarifa RFP {anio}</th><th>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {(todas ? ranking : ranking.slice(0, 25)).map((x, i) => {
                const t = tarifaPorClave.get(claveEmpresa(x.cuenta))
                const tarifa = t?.tarifas[0] ?? null
                return (
                  <tr key={x.cuenta} className="border-b border-neutral-100 text-right">
                    <td className="py-1.5 pr-2 text-left text-neutral-400">{i + 1}</td>
                    <td className="pr-2 text-left font-medium">{x.cuenta}</td>
                    <td className="pr-2 text-left text-xs capitalize text-neutral-500">{rubroDe(x.cuenta).toLowerCase()}</td>
                    <td className="pr-2 text-left text-xs text-neutral-500">{ejecDe(x.cuenta)}</td>
                    <td className="pr-2">{entero(x.a.rn)}</td>
                    <td className="pr-2 text-xs"><Var a={x.a.rn} b={x.b.rn} /></td>
                    <td className="pr-2">{dinero(adr(x.a), 'USD')}</td>
                    <td className="pr-2 text-xs text-neutral-500" title={t ? `${t.cuenta} · ${t.producto}` : undefined}>
                      {tarifa ? dinero(tarifa, 'USD') : t?.descuento ? `-${t.descuento}%` : '—'}
                    </td>
                    <td>{dinero(x.a.rev, 'USD')}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-marca text-right font-semibold">
              <tr><td className="py-2 text-left" colSpan={4}>Total ({ranking.length} cuentas)</td><td className="pr-2">{entero(sumar(ranking.map((x) => x.a)).rn)}</td><td />
                <td className="pr-2">{dinero(adr(sumar(ranking.map((x) => x.a))), 'USD')}</td><td /><td>{dinero(sumar(ranking.map((x) => x.a)).rev, 'USD')}</td></tr>
            </tfoot>
          </table>
        </div>
        {ranking.length > 25 && (
          <button onClick={() => setTodas(!todas)} className="mt-3 text-sm text-marca underline">{todas ? 'Ver solo las primeras 25' : `Ver las ${ranking.length} cuentas`}</button>
        )}
        <p className="mt-2 text-[11px] text-neutral-500">La tarifa RFP es la de habitación single del primer pool acordada para el año; se une a la cuenta por el nombre de la empresa.</p>
      </Tarjeta>

      <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <TablaGrupo titulo="Por ejecutivo" datos={porEjecutivo} />
        <TablaGrupo titulo="Por rubro" datos={porRubro} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <Tarjeta titulo={`Cuentas que bajaron contra ${anioAnt}`}>
          {bajaron.length === 0 ? <p className="text-sm text-neutral-500">Ninguna cuenta importante bajó en el período.</p> : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {bajaron.map((x) => (
                <li key={x.cuenta} className="flex justify-between gap-3 py-1.5">
                  <span>{x.cuenta} <span className="text-xs text-neutral-400">· {ejecDe(x.cuenta)}</span></span>
                  <span className="tabular-nums">{entero(x.b.rn)} → {entero(x.a.rn)} <span className="text-acento">({entero(x.a.rn - x.b.rn)})</span></span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
        <Tarjeta titulo={`Con tarifa ${anio} y sin producción en el período`}>
          {tarifasAnio.length === 0 ? <p className="text-sm text-neutral-500">No hay tarifas RFP cargadas para {anio}.</p>
            : sinProduccion.length === 0 ? <p className="text-sm text-neutral-500">Todas las cuentas con tarifa {anio} tuvieron producción.</p> : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {sinProduccion.map((t) => (
                  <li key={t.cuenta} className="flex justify-between gap-3 py-1.5">
                    <span>{t.cuenta} {t.contacto && <span className="text-xs text-neutral-400">· {t.contacto}</span>}</span>
                    <span className="tabular-nums text-neutral-500">{t.tarifas[0] ? dinero(t.tarifas[0], 'USD') : t.descuento ? `-${t.descuento}%` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          <p className="mt-2 text-[11px] text-neutral-500">Cuentas con tarifa negociada que no generaron noches: oportunidad para el ejecutivo de la cuenta.</p>
        </Tarjeta>
      </div>
    </div>
  )
}
