'use client'
import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { PaisMes } from '@/lib/datos'
import { entero, mesCorto, pct, variacionTexto } from '@/lib/formato'
import { type InfoPais, infoPais, nombreContinente, nombrePais } from '@/lib/paises'
import Globo, { type PuntoGlobo } from './Globo'
import { AvisoDemo, Kpi, Selector, Tarjeta } from './ui'
import { COLORES } from './colores'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const COLORES_CONT = ['#b5121b', '#1c1c1c', '#737373', '#a3a3a3', '#d4d4d4', '#e8a0a4']

type Fila = { clave: string; nombre: string; iso2: string | null; info: InfoPais | null; continente: string; n: number; ant: number }

function Bandera({ iso2, grande = false }: { iso2: string | null; grande?: boolean }) {
  if (!iso2) return <span className={`inline-block rounded-[2px] bg-neutral-200 ${grande ? 'h-6 w-8' : 'h-3 w-4'}`} />
  return <span className={`fi fi-${iso2} rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] ${grande ? '!h-6 !w-8' : ''}`} />
}

export default function RegistroPaises({ demo, paises }: { demo: boolean; paises: PaisMes[] }) {
  const ultimoMes = paises.reduce((m, r) => (r.mes > m ? r.mes : m), '')
  const anios = [...new Set(paises.map((r) => r.mes.slice(0, 4)))].sort().reverse()
  const [anio, setAnio] = useState(anios[0] ?? '')
  const [mes, setMes] = useState('todos')
  const [sel, setSel] = useState<string | null>(null)

  // período elegido y el mismo período del año anterior (si el año está en curso, hasta el último mes informado)
  const tope = anio === ultimoMes.slice(0, 4) ? Number(ultimoMes.slice(5)) : 12
  const mesesPeriodo = mes === 'todos' ? Array.from({ length: tope }, (_, i) => i + 1) : [Number(mes)]
  const enPeriodo = (m: string, a: string) => m.slice(0, 4) === a && mesesPeriodo.includes(Number(m.slice(5)))
  const anioAnt = String(Number(anio) - 1)

  const filas = useMemo(() => {
    const idx = new Map<string, Fila>()
    for (const r of paises) {
      const act = enPeriodo(r.mes, anio), ant = enPeriodo(r.mes, anioAnt)
      if (!act && !ant) continue
      const info = infoPais(r.pais)
      const clave = info?.iso2 ?? r.pais
      const f = idx.get(clave) ?? { clave, nombre: nombrePais(r.pais), iso2: info?.iso2 ?? null, info, continente: nombreContinente(r.continente), n: 0, ant: 0 }
      if (act) f.n += r.n
      else f.ant += r.n
      idx.set(clave, f)
    }
    return [...idx.values()].sort((a, b) => b.n - a.n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paises, anio, mes])

  const total = filas.reduce((s, f) => s + f.n, 0)
  const totalAnt = filas.reduce((s, f) => s + f.ant, 0)
  const locales = filas.find((f) => f.iso2 === 'ar')
  const extranjeros = total - (locales?.n ?? 0)
  const extranjerosAnt = totalAnt - (locales?.ant ?? 0)
  const conPais = filas.filter((f) => f.n > 0 && f.info)
  const principal = conPais.find((f) => f.iso2 !== 'ar')

  const puntos: PuntoGlobo[] = conPais.map((f) => ({
    clave: f.clave, iso2: f.iso2!, num: f.info!.num, nombre: f.nombre, lat: f.info!.lat, lon: f.info!.lon, n: f.n,
    share: total ? (100 * f.n) / total : 0, varAnual: f.ant ? (f.n - f.ant) / f.ant : null,
  }))

  const continentes = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of filas) m.set(f.continente, (m.get(f.continente) ?? 0) + f.n)
    return [...m].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([nombre, n]) => ({ nombre, n }))
  }, [filas])

  const movimientos = filas.filter((f) => f.ant >= 100 && f.iso2).map((f) => ({ ...f, dif: f.n - f.ant }))
  const suben = [...movimientos].sort((a, b) => b.dif - a.dif).slice(0, 5).filter((f) => f.dif > 0)
  const bajan = [...movimientos].sort((a, b) => a.dif - b.dif).slice(0, 5).filter((f) => f.dif < 0)

  // evolución anual: argentinos vs extranjeros
  const porAnio = useMemo(() => {
    const m = new Map<string, { anio: string; locales: number; extranjeros: number }>()
    for (const r of paises) {
      const a = r.mes.slice(0, 4)
      const x = m.get(a) ?? { anio: a, locales: 0, extranjeros: 0 }
      if (infoPais(r.pais)?.iso2 === 'ar') x.locales += r.n
      else x.extranjeros += r.n
      m.set(a, x)
    }
    return [...m.values()].sort((a, b) => a.anio.localeCompare(b.anio))
      .map((x) => ({ ...x, pctExt: (100 * x.extranjeros) / (x.locales + x.extranjeros || 1), parcial: x.anio === ultimoMes.slice(0, 4) }))
  }, [paises, ultimoMes])

  const seleccion = filas.find((f) => f.clave === sel)
  const serieSel = useMemo(() => {
    if (!sel) return []
    const porMes = new Map<string, { mes: string; n: number; total: number }>()
    for (const r of paises) {
      if (r.mes < `${Number(ultimoMes.slice(0, 4)) - 2}${ultimoMes.slice(4)}`) continue
      const x = porMes.get(r.mes) ?? { mes: r.mes, n: 0, total: 0 }
      x.total += r.n
      if ((infoPais(r.pais)?.iso2 ?? r.pais) === sel) x.n += r.n
      porMes.set(r.mes, x)
    }
    return [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes))
      .map((x) => ({ etiqueta: mesCorto(x.mes), n: x.n, share: x.total ? (100 * x.n) / x.total : 0 }))
  }, [sel, paises, ultimoMes])

  if (!paises.length) {
    return <Tarjeta><p className="text-sm text-neutral-500">Todavía no se cargó la planilla de huéspedes por país.</p></Tarjeta>
  }
  const periodoTxt = mes === 'todos' ? (tope < 12 ? `enero a ${MESES[tope - 1].toLowerCase()} ${anio}` : `año ${anio}`) : `${MESES[Number(mes) - 1].toLowerCase()} ${anio}`

  return (
    <div className="space-y-5">
      {demo && <AvisoDemo />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo">Registro por país</h1>
          <p className="text-sm text-neutral-500">
            Huéspedes según país de origen · {periodoTxt} · comparado con el mismo período de {anioAnt}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Selector etiqueta="Año" valor={anio} onChange={(a) => { setAnio(a); setMes('todos') }}
            opciones={anios.map((a) => ({ valor: a, texto: a }))} />
          <Selector etiqueta="Mes" valor={mes} onChange={setMes}
            opciones={[{ valor: 'todos', texto: 'Todo el año' }, ...MESES.slice(0, tope).map((m, i) => ({ valor: String(i + 1), texto: m }))]} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi titulo="Huéspedes" valor={entero(total)}
          variacion={{ texto: `${variacionTexto(totalAnt ? (total - totalAnt) / totalAnt : null)} vs ${anioAnt}`, valor: total - totalAnt }} />
        <Kpi titulo="Extranjeros" valor={pct(total ? (100 * extranjeros) / total : 0, 1)} detalle={`${entero(extranjeros)} huéspedes`}
          variacion={{ texto: `${variacionTexto(extranjerosAnt ? (extranjeros - extranjerosAnt) / extranjerosAnt : null)} vs ${anioAnt}`, valor: extranjeros - extranjerosAnt }} />
        <Kpi titulo="Países de origen" valor={entero(conPais.length)} detalle={`${continentes.length} continentes`} />
        <div className="tarjeta h-full rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Principal mercado extranjero</div>
          {principal && (
            <div className="mt-2 flex items-center gap-3">
              <Bandera iso2={principal.iso2} grande />
              <div>
                <div className="text-xl font-bold">{principal.nombre}</div>
                <div className="text-xs text-neutral-500">{pct((100 * principal.n) / total, 1)} de los huéspedes</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Tarjeta titulo="De dónde vienen nuestros huéspedes · Marriott Buenos Aires"
          extra={<span className="text-xs text-neutral-500">Arrastrá para girar · tocá un país para ver su evolución</span>}>
          <Globo puntos={puntos} seleccionado={sel} onSeleccionar={setSel} />
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
            menos
            <span className="h-2 w-40 rounded-full" style={{ background: 'linear-gradient(90deg, rgb(246,214,214), rgb(150,14,24))' }} />
            más huéspedes
          </div>
        </Tarjeta>

        <Tarjeta titulo="Ranking de países" extra={<span className="text-xs text-neutral-500">vs {anioAnt}</span>}>
          <ol className="max-h-[560px] space-y-1 overflow-y-auto pr-1">
            {filas.filter((f) => f.n > 0).map((f, i) => {
              const share = total ? (100 * f.n) / total : 0
              const v = f.ant ? (f.n - f.ant) / f.ant : null
              const activo = f.clave === sel
              return (
                <li key={f.clave}>
                  <button type="button" onClick={() => setSel(activo ? null : f.clave)}
                    className={`w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${activo ? 'bg-marca text-white' : 'hover:bg-neutral-100'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-5 text-right text-xs tabular-nums ${activo ? 'text-neutral-300' : 'text-neutral-400'}`}>{i + 1}</span>
                      <Bandera iso2={f.iso2} />
                      <span className="flex-1 truncate">{f.nombre}</span>
                      <span className="tabular-nums">{entero(f.n)}</span>
                      <span className={`w-14 text-right text-xs tabular-nums ${activo ? 'text-neutral-300' : 'text-neutral-500'}`}>{pct(share, 1)}</span>
                      <span className={`w-16 text-right text-xs tabular-nums ${v === null ? 'text-neutral-400' : v >= 0 ? (activo ? 'text-emerald-300' : 'text-emerald-700') : (activo ? 'text-red-300' : 'text-acento')}`}>
                        {v === null ? 'nuevo' : `${v >= 0 ? '▲' : '▼'} ${pct(Math.abs(v * 100), 0)}`}
                      </span>
                    </div>
                    <div className={`ml-7 mt-1 h-1 rounded-full ${activo ? 'bg-white/20' : 'bg-neutral-100'}`}>
                      <div className={`h-1 rounded-full ${activo ? 'bg-white' : 'bg-acento'}`} style={{ width: `${Math.min(100, (100 * f.n) / (filas[0]?.n || 1))}%` }} />
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>
        </Tarjeta>
      </div>

      {seleccion && (
        <Tarjeta titulo={<span className="flex items-center gap-2"><Bandera iso2={seleccion.iso2} grande /> {seleccion.nombre} · últimos 24 meses</span>}
          extra={<button type="button" onClick={() => setSel(null)} className="text-xs text-neutral-500 underline">cerrar</button>}>
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={serieSel} margin={{ left: 0, right: 8 }}>
                <CartesianGrid stroke={COLORES.grilla} vertical={false} />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} minTickGap={12} />
                <YAxis yAxisId="n" tick={{ fontSize: 11 }} width={50} />
                <YAxis yAxisId="p" orientation="right" unit="%" tick={{ fontSize: 11 }} width={40} />
                <Tooltip formatter={(v, n) => (n === 'Participación' ? pct(Number(v), 1) : entero(Number(v)))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="n" dataKey="n" name="Huéspedes" fill={COLORES.acento} radius={[3, 3, 0, 0]} />
                <Line yAxisId="p" dataKey="share" name="Participación" stroke={COLORES.principal} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tarjeta titulo="Argentinos y extranjeros por año" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <ComposedChart data={porAnio} margin={{ left: 0, right: 8 }}>
                <CartesianGrid stroke={COLORES.grilla} vertical={false} />
                <XAxis dataKey="anio" tick={{ fontSize: 11 }} tickFormatter={(a: string) => (porAnio.find((x) => x.anio === a)?.parcial ? `${a}*` : a)} />
                <YAxis yAxisId="n" tick={{ fontSize: 11 }} width={60} tickFormatter={(v: number) => entero(v)} />
                <YAxis yAxisId="p" orientation="right" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} width={40} />
                <Tooltip formatter={(v, n) => (n === '% extranjeros' ? pct(Number(v), 1) : entero(Number(v)))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="n" dataKey="locales" stackId="a" name="Argentinos" fill={COLORES.gris} />
                <Bar yAxisId="n" dataKey="extranjeros" stackId="a" name="Extranjeros" fill={COLORES.principal} radius={[3, 3, 0, 0]} />
                <Line yAxisId="p" dataKey="pctExt" name="% extranjeros" stroke={COLORES.acento} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-neutral-500">* año en curso, hasta {mesCorto(ultimoMes)}. 2020 no figura en la planilla.</p>
        </Tarjeta>

        <Tarjeta titulo="Por continente">
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={continentes} dataKey="n" nameKey="nombre" innerRadius="55%" outerRadius="95%" stroke="none" isAnimationActive={false}>
                  {continentes.map((c, i) => <Cell key={c.nombre} fill={COLORES_CONT[i % COLORES_CONT.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => entero(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {continentes.map((c, i) => (
              <li key={c.nombre} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORES_CONT[i % COLORES_CONT.length] }} />{c.nombre}
                </span>
                <span className="tabular-nums">{pct((100 * c.n) / (total || 1), 1)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[{ t: 'Mercados que más crecieron', l: suben }, { t: 'Mercados que más cayeron', l: bajan }].map(({ t, l }) => (
          <Tarjeta key={t} titulo={t} extra={<span className="text-xs text-neutral-500">en huéspedes, vs {anioAnt}</span>}>
            {l.length === 0 ? <p className="text-sm text-neutral-500">Sin movimientos relevantes.</p> : (
              <div className="h-52">
                <ResponsiveContainer>
                  <BarChart data={l.map((f) => ({ nombre: f.nombre, dif: Math.abs(f.dif), signo: f.dif > 0 ? '+' : '−' }))} layout="vertical" margin={{ left: 0, right: 50 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v, _n, item) => `${(item?.payload as { signo: string }).signo}${entero(Number(v))} huéspedes`} />
                    <Bar dataKey="dif" radius={[0, 3, 3, 0]} label={{ position: 'right', fontSize: 11, formatter: (v: unknown) => `${t.includes('crecieron') ? '+' : '−'}${entero(Number(v))}` }}>
                      {l.map((f) => <Cell key={f.clave} fill={f.dif > 0 ? COLORES.principal : COLORES.acento} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Tarjeta>
        ))}
      </div>
    </div>
  )
}
