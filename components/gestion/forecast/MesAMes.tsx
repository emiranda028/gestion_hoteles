'use client'
import { Fragment, useState } from 'react'
import { kpis, type Escenario } from '@/lib/gestion/forecast/calculo'
import { MESES } from '@/lib/gestion/forecast/modelo'
import { Segmentado } from '../../ui'
import type { Moneda, Props, useContexto } from './Forecast'
import { dinero, entero, pct } from './formato'

type Metrica = 'rn' | 'adr' | 'revenue' | 'ocupacion'

export default function MesAMes({ p, ctx, moneda }: { p: Props; ctx: ReturnType<typeof useContexto>; moneda: Moneda }) {
  const [metrica, setMetrica] = useState<Metrica>('revenue')
  const [esc, setEsc] = useState<Escenario | 'vsbudget'>('forecast')
  const todos = Array.from({ length: 12 }, (_, i) => i)
  const valor = (claves: string[], meses: number[]) => {
    // la ocupación de una categoría es su aporte a la ocupación total (noches propias sobre habitaciones del hotel)
    const k = (e: Escenario) => {
      const t = ctx.total(e, claves, meses)
      const all = ctx.total(e, ctx.cods, meses)
      return { ...kpis(t, moneda), ocupacion: all.disp ? t.rn / all.disp : 0 }
    }
    if (esc === 'vsbudget') {
      const a = k('forecast')[metrica], b = k('budget')[metrica]
      return metrica === 'ocupacion' ? a - b : b ? (a - b) / Math.abs(b) : null
    }
    return k(esc)[metrica]
  }
  const fmt = (v: number | null) => {
    if (v === null) return '—'
    if (esc === 'vsbudget') return `${v >= 0 ? '+' : ''}${metrica === 'ocupacion' ? (v * 100).toFixed(1) + ' pts' : pct(v)}`
    return metrica === 'rn' ? entero(v) : metrica === 'ocupacion' ? pct(v) : dinero(v, moneda, metrica === 'revenue')
  }
  const clase = (v: number | null) => (esc !== 'vsbudget' || v === null ? '' : v >= 0 ? 'text-emerald-700' : 'text-acento')
  const Fila = ({ nombre, claves, estilo }: { nombre: string; claves: string[]; estilo: string }) => (
    <tr className={`border-b border-neutral-100 ${estilo}`}>
      <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5">{nombre}</td>
      {todos.map((m) => {
        const v = valor(claves, [m])
        return <td key={m} className={`px-2 text-right tabular-nums ${clase(v)} ${esc === 'forecast' && !ctx.cerrados[m] ? 'italic' : ''}`}>{fmt(v)}</td>
      })}
      <td className={`px-3 text-right font-bold tabular-nums ${clase(valor(claves, todos))}`}>{fmt(valor(claves, todos))}</td>
    </tr>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmentado valor={metrica} onChange={setMetrica} opciones={[{ valor: 'revenue', texto: 'Revenue' }, { valor: 'rn', texto: 'Noches' }, { valor: 'adr', texto: 'ADR' }, { valor: 'ocupacion', texto: 'Ocupación' }]} />
        <select value={esc} onChange={(e) => setEsc(e.target.value as typeof esc)} className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm">
          <option value="forecast">Forecast (Real en meses cerrados)</option>
          <option value="budget">Budget</option>
          <option value="real">Solo Real</option>
          {p.previo && <option value="anterior">Año anterior</option>}
          <option value="vsbudget">Forecast vs Budget (%)</option>
        </select>
        {esc === 'forecast' && <span className="text-xs text-neutral-500">En cursiva, los meses proyectados.</span>}
      </div>
      <div className="tarjeta overflow-x-auto rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <table className="w-full min-w-[72rem] text-sm">
          <thead className="border-b-2 border-marca text-right text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="sticky left-0 bg-white px-3 py-2 text-left">Segmento</th>
              {MESES.map((m, i) => <th key={m} className={`px-2 ${ctx.cerrados[i] ? 'text-neutral-800' : ''}`}>{m}{ctx.cerrados[i] ? ' ●' : ''}</th>)}
              <th className="px-3">Año</th>
            </tr>
          </thead>
          <tbody>
            {ctx.arbol.map((c) => (
              <Fragment key={c.cat}>
                <Fila nombre={c.cat} claves={c.claves} estilo="bg-neutral-100 font-bold" />
                {c.segmentos.map((s) => <Fila key={s.seg} nombre={s.seg} claves={s.claves} estilo="bg-white" />)}
              </Fragment>
            ))}
            <Fila nombre="Total" claves={ctx.cods} estilo="bg-marca text-white font-bold" />
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">● mes cerrado (con Real). La ocupación de cada segmento es su aporte a la ocupación total del hotel.</p>
    </div>
  )
}
