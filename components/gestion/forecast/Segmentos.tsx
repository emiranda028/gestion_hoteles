'use client'
import { Fragment, useState } from 'react'
import { kpis, variacion } from '@/lib/gestion/forecast/calculo'
import { clave } from '@/lib/gestion/forecast/modelo'
import type { Moneda, Props, useContexto } from './Forecast'
import { dinero, entero, pct } from './formato'

export default function Segmentos({ p, ctx, moneda }: { p: Props; ctx: ReturnType<typeof useContexto>; moneda: Moneda }) {
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(ctx.arbol.map((c) => c.cat)))
  const hayAnt = !!p.previo
  const alternar = (k: string) => setAbiertos((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })

  const Fila = ({ nombre, claves, nivel, k, expandible }: { nombre: string; claves: string[]; nivel: 0 | 1 | 2 | 3; k?: string; expandible?: boolean }) => {
    const a = kpis(ctx.total('forecast', claves), moneda), b = kpis(ctx.total('budget', claves), moneda), c = kpis(ctx.total('anterior', claves), moneda)
    const vb = variacion(a.revenue, b.revenue), vc = variacion(a.revenue, c.revenue)
    const estilo = ['bg-marca text-white font-bold', 'bg-neutral-100 font-bold', 'font-semibold', 'text-neutral-600'][nivel]
    const color = (v: number | null) => (v === null ? 'text-neutral-400' : v >= 0 ? 'text-emerald-700' : 'text-acento')
    return (
      <tr className={`border-b border-neutral-100 ${estilo}`}>
        <td className="py-1.5 pr-2" style={{ paddingLeft: `${0.75 + nivel * 0.9}rem` }}>
          {expandible ? <button onClick={() => alternar(k!)} className="mr-1 inline-block w-4 text-left">{abiertos.has(k!) ? '▾' : '▸'}</button> : <span className="mr-1 inline-block w-4" />}
          {nombre}
        </td>
        <td className="px-2 text-right tabular-nums">{entero(a.rn)}</td>
        <td className="px-2 text-right tabular-nums">{dinero(a.adr, moneda)}</td>
        <td className="px-2 text-right tabular-nums">{dinero(a.revenue, moneda)}</td>
        <td className="px-2 text-right tabular-nums opacity-80">{entero(b.rn)}</td>
        <td className="px-2 text-right tabular-nums opacity-80">{dinero(b.adr, moneda)}</td>
        <td className="px-2 text-right tabular-nums opacity-80">{dinero(b.revenue, moneda)}</td>
        <td className={`px-2 text-right tabular-nums ${nivel === 0 ? '' : color(vb)}`}>{vb === null ? '—' : `${vb >= 0 ? '+' : ''}${pct(vb)}`}</td>
        {hayAnt && <>
          <td className="px-2 text-right tabular-nums opacity-80">{dinero(c.revenue, moneda)}</td>
          <td className={`px-2 text-right tabular-nums ${nivel === 0 ? '' : color(vc)}`}>{vc === null ? '—' : `${vc >= 0 ? '+' : ''}${pct(vc)}`}</td>
        </>}
      </tr>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-neutral-500">Category › Segment › Código. Tocá ▸ para abrir o cerrar.</p>
        <div className="flex gap-2">
          <button onClick={() => setAbiertos(new Set(ctx.arbol.map((c) => c.cat)))} className="rounded-full border border-neutral-300 bg-white px-3 py-1">Abrir segmentos</button>
          <button onClick={() => setAbiertos(new Set([...ctx.arbol.map((c) => c.cat), ...ctx.arbol.flatMap((c) => c.segmentos.map((s) => c.cat + '|' + s.seg))]))} className="rounded-full border border-neutral-300 bg-white px-3 py-1">Abrir códigos</button>
          <button onClick={() => setAbiertos(new Set())} className="rounded-full border border-neutral-300 bg-white px-3 py-1">Cerrar todo</button>
        </div>
      </div>
      <div className="tarjeta overflow-x-auto rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-neutral-500">
            <tr className="border-b border-neutral-200">
              <th />
              <th colSpan={3} className="border-l border-neutral-200 px-2 pt-2 text-center text-neutral-800">{ctx.etiquetaActual}</th>
              <th colSpan={3} className="border-l border-neutral-200 px-2 pt-2 text-center text-acento">Budget</th>
              <th className="border-l border-neutral-200 px-2 pt-2 text-center">vs Budget</th>
              {hayAnt && <th colSpan={2} className="border-l border-neutral-200 px-2 pt-2 text-center text-blue-700">Año anterior</th>}
            </tr>
            <tr className="border-b-2 border-marca text-right">
              <th className="px-3 py-2 text-left">Segmento</th>
              <th className="border-l border-neutral-200 px-2">RN</th><th className="px-2">ADR</th><th className="px-2">Revenue</th>
              <th className="border-l border-neutral-200 px-2">RN</th><th className="px-2">ADR</th><th className="px-2">Revenue</th>
              <th className="border-l border-neutral-200 px-2">Rev. %</th>
              {hayAnt && <><th className="border-l border-neutral-200 px-2">Revenue</th><th className="px-2">Var. %</th></>}
            </tr>
          </thead>
          <tbody>
            {ctx.arbol.map((c) => (
              <Fragment key={c.cat}>
                <Fila nombre={c.cat} claves={c.claves} nivel={1} k={c.cat} expandible />
                {abiertos.has(c.cat) && c.segmentos.map((s) => {
                  const ks = c.cat + '|' + s.seg
                  const conCodigos = s.codigos.length > 1 || s.codigos[0]?.desc !== s.seg
                  return (
                    <Fragment key={ks}>
                      <Fila nombre={s.seg} claves={s.claves} nivel={2} k={ks} expandible={conCodigos} />
                      {conCodigos && abiertos.has(ks) && s.codigos.map((x) => <Fila key={clave(x)} nombre={`${x.cod} · ${x.desc}`} claves={[clave(x)]} nivel={3} />)}
                    </Fragment>
                  )
                })}
              </Fragment>
            ))}
            <Fila nombre="Total" claves={ctx.cods} nivel={0} />
          </tbody>
        </table>
      </div>
    </div>
  )
}
