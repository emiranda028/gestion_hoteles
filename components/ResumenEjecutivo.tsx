'use client'
import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { Disponible, FlashDia, Grupo, Hotel } from '@/lib/datos'
import { decimal, dinero, entero, pct } from '@/lib/formato'
import { AvisoDemo, Selector } from './ui'
import { COLORES } from './colores'

type Props = { demo: boolean; grupos: Grupo[]; hoteles: Hotel[]; flashDias: FlashDia[]; disponibles: Disponible[] }

const UMBRAL_VERDE = 60 // % de ocupación a partir del cual el indicador se pinta de verde
const VERDE = '#1a8f2e'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
function fechaTexto(f: string) {
  const d = new Date(f + 'T12:00:00Z')
  return `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
}
const anioAntes = (f: string) => `${Number(f.slice(0, 4)) - 1}${f.slice(4)}`
const miles = (v: number) => Math.round(v).toLocaleString('es-AR')

function Caja({ titulo, children, className = '', tituloRojo = false }: {
  titulo?: string; children: React.ReactNode; className?: string; tituloRojo?: boolean
}) {
  return (
    <div className={`tarjeta flex flex-col items-center justify-center rounded-xl bg-white p-3 text-center shadow-[0_1px_4px_rgba(0,0,0,0.08)] ${className}`}>
      {titulo && <div className={`text-xs font-semibold ${tituloRojo ? 'text-acento' : 'text-neutral-600'}`}>{titulo}</div>}
      {children}
    </div>
  )
}

function Medidor({ valor }: { valor: number }) {
  const v = Math.max(0, Math.min(100, valor))
  const color = v >= UMBRAL_VERDE ? VERDE : COLORES.acento
  const r = 80, cx = 100, cy = 95
  const ang = Math.PI * (1 - v / 100)
  const x = cx + r * Math.cos(ang), y = cy - r * Math.sin(ang)
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[220px]" role="img" aria-label={`Ocupación ${pct(v, 2)}`}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#efefef" strokeWidth="26" />
      {v > 0 && <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`} fill="none" stroke={color} strokeWidth="26" />}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-neutral-900" style={{ fontSize: 26, fontWeight: 700 }}>
        {pct(v, 2)}
      </text>
    </svg>
  )
}

function Rubros({ d }: { d: FlashDia }) {
  const datos = [
    { nombre: 'Alojamiento', v: d.rev, color: COLORES.acento },
    { nombre: 'Alimentos & Bebidas', v: d.ayb, color: '#b3b3b3' },
    { nombre: 'Diversas', v: d.otros, color: '#4a4a4a' },
  ].filter((x) => x.v > 0) // los ajustes negativos no entran en la torta
  const total = datos.reduce((s, x) => s + x.v, 0)
  if (!total) return <p className="py-8 text-sm text-neutral-500">Sin ventas informadas</p>
  return (
    <div className="flex w-full items-center gap-2">
      <div className="h-32 w-32 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={datos} dataKey="v" innerRadius="55%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
              {datos.map((x) => <Cell key={x.nombre} fill={x.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5 text-left text-xs">
        {datos.map((x) => (
          <li key={x.nombre} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: x.color }} />
            <span>
              {x.nombre}
              <br />
              <span className="tabular-nums text-neutral-600">USD {miles(x.v)} ({pct((100 * x.v) / total, 2)})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ColumnaHotel({ hotel, d, ant }: { hotel: Hotel; d: FlashDia | undefined; ant: FlashDia | undefined }) {
  const occ = d && d.hab ? (100 * d.ocup) / d.hab : 0
  const occAnt = ant && ant.hab ? (100 * ant.ocup) / ant.hab : null
  return (
    <section className="space-y-2">
      <h2 className="rounded-xl border-b-4 border-acento bg-white px-4 py-3 text-center text-lg font-bold uppercase tracking-wide shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        {hotel.nombre}
      </h2>
      {!d ? (
        <Caja className="h-40"><p className="text-sm text-neutral-500">No llegó el Manager Flash de esta fecha</p></Caja>
      ) : (
        <>
          <div className="grid grid-cols-[1.4fr_1fr] gap-2">
            <Caja className="row-span-2">
              <div className="text-lg font-semibold">Tasa Ocupación</div>
              <Medidor valor={occ} />
              {occAnt !== null && (
                <div className="text-xs text-neutral-500">año anterior {pct(occAnt, 1)}</div>
              )}
            </Caja>
            <Caja titulo="Habitaciones vendidas" tituloRojo><div className="mt-1 text-xl tabular-nums">{entero(d.ocup)}</div></Caja>
            <Caja titulo="Huéspedes" tituloRojo><div className="mt-1 text-xl tabular-nums">{entero(d.pax)}</div></Caja>
          </div>
          <div className="grid grid-cols-[1.4fr_1fr] gap-2">
            <Caja>
              <div className="text-2xl font-bold tabular-nums">{dinero(d.tot, 'USD')}</div>
              <div className="text-sm">Ventas Totales</div>
              {ant && <div className="text-xs text-neutral-500">año anterior {dinero(ant.tot, 'USD')}</div>}
            </Caja>
            <Caja titulo="Tasa doble ocupación" tituloRojo>
              <div className="mt-1 text-xl tabular-nums">{d.ocup ? decimal(d.pax / d.ocup, 2) : '—'}</div>
            </Caja>
          </div>
          <div className="grid grid-cols-[1.4fr_1fr] gap-2">
            <Caja>
              <div className="text-2xl font-bold tabular-nums">{dinero(d.adr, 'USD')}</div>
              <div className="text-sm">ADR</div>
            </Caja>
            <Caja>
              <div className="text-2xl font-bold tabular-nums">{dinero(d.hab ? d.rev / d.hab : 0, 'USD')}</div>
              <div className="text-sm">RevPar</div>
            </Caja>
          </div>
          <Caja titulo="Ventas por rubro"><Rubros d={d} /></Caja>
        </>
      )}
    </section>
  )
}

export default function ResumenEjecutivo({ demo, grupos, hoteles, flashDias, disponibles }: Props) {
  const conHoteles = grupos.filter((g) => hoteles.some((h) => h.activo && h.grupo === g.id))
  const [grupo, setGrupo] = useState(conHoteles[0]?.id ?? '')
  const hotelesGrupo = hoteles.filter((h) => h.activo && h.grupo === grupo)
  const ids = new Set(hotelesGrupo.map((h) => h.id))

  const fechas = useMemo(
    () => [...new Set(flashDias.filter((d) => ids.has(d.h)).map((d) => d.r))].sort().reverse(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flashDias, grupo],
  )
  const [fechaSel, setFechaSel] = useState('')
  const fecha = fechas.includes(fechaSel) ? fechaSel : fechas[0] ?? ''

  const porHotel = (h: string, r: string) => flashDias.find((d) => d.h === h && d.r === r)
  const disp = [...disponibles].reverse().find((d) => d.g === grupo && d.f <= fecha)

  return (
    <div className="space-y-4">
      {demo && <AvisoDemo />}
      <div className="grid gap-3 lg:grid-cols-[1fr_1.3fr_1.4fr_0.6fr_0.6fr]">
        <div className="tarjeta space-y-2 rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <h1 className="text-base font-bold uppercase tracking-wide">Resumen ejecutivo comparado</h1>
          {conHoteles.length > 1 && (
            <Selector etiqueta="Grupo" valor={grupo} onChange={(g) => { setGrupo(g); setFechaSel('') }}
              opciones={conHoteles.map((g) => ({ valor: g.id, texto: g.nombre }))} />
          )}
          <label className="flex flex-col gap-1 text-xs font-semibold text-acento">
            Fecha
            <select value={fecha} onChange={(e) => setFechaSel(e.target.value)}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-normal text-neutral-900">
              {fechas.map((f) => <option key={f} value={f}>{fechaTexto(f)}</option>)}
            </select>
          </label>
        </div>
        {disp ? (
          <>
            <div className="tarjeta overflow-hidden rounded-xl bg-white text-center shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
              <div className="bg-marca py-2 text-base font-semibold text-white">Total Disponibilidades</div>
              <div className="flex h-[calc(100%-2.5rem)] min-h-20 items-center justify-center text-3xl font-bold tabular-nums">$ {miles(disp.total)}</div>
            </div>
            <div className="grid gap-2">
              <Caja titulo="Disponibilidades Moneda Extranjera"><div className="text-2xl font-bold tabular-nums">$ {miles(disp.monedaExtranjera)}</div></Caja>
              <Caja titulo="Disponibilidades Moneda Local"><div className="text-2xl font-bold tabular-nums">$ {miles(disp.monedaLocal)}</div></Caja>
            </div>
            <Caja titulo="USD"><div className="text-xl font-bold tabular-nums">{miles(disp.usd)}</div></Caja>
            <Caja titulo="EUR"><div className="text-xl font-bold tabular-nums">{miles(disp.eur)}</div></Caja>
          </>
        ) : (
          <Caja className="lg:col-span-4"><p className="text-sm text-neutral-500">Sin informe de disponibilidades para esta fecha.</p></Caja>
        )}
      </div>
      {disp && disp.f !== fecha && (
        <p className="text-xs text-neutral-500">Disponibilidades: último informe recibido, del {fechaTexto(disp.f)}.</p>
      )}

      <div className={`grid gap-4 ${hotelesGrupo.length >= 3 ? 'lg:grid-cols-3' : hotelesGrupo.length === 2 ? 'md:grid-cols-2' : 'max-w-md'}`}>
        {hotelesGrupo.map((h) => (
          <ColumnaHotel key={h.id} hotel={h} d={porHotel(h.id, fecha)} ant={porHotel(h.id, anioAntes(fecha))} />
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        La fecha es la del día en que llega el informe; los indicadores de los hoteles son del cierre del día anterior.
        Ocupación en verde desde {UMBRAL_VERDE}%.
      </p>
    </div>
  )
}
