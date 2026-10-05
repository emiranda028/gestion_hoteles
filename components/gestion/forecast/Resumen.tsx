'use client'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { kpis, mesesConReal, variacion, type Escenario } from '@/lib/gestion/forecast/calculo'
import { MESES, MESES_LARGOS } from '@/lib/gestion/forecast/modelo'
import type { Moneda, Periodo, Props, useContexto } from './Forecast'
import { dinero, entero, pct, pctPts } from './formato'

const sombra = 'tarjeta rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]'

function Delta({ v, pts = false, invertir = false }: { v: number | null; pts?: boolean; invertir?: boolean }) {
  if (v === null || !Number.isFinite(v)) return <span className="text-neutral-400">—</span>
  const bueno = invertir ? v < 0 : v >= 0
  return <span className={`font-semibold ${bueno ? 'text-emerald-700' : 'text-acento'}`}>{v >= 0 ? '▲' : '▼'} {pts ? pctPts(Math.abs(v)) : pct(Math.abs(v))}</span>
}

export default function ResumenForecast({ p, ctx, periodo, mes, moneda }: {
  p: Props; ctx: ReturnType<typeof useContexto>; periodo: Periodo; mes: number; moneda: Moneda
}) {
  const act = kpis(ctx.total('forecast'), moneda), bud = kpis(ctx.total('budget'), moneda), ant = kpis(ctx.total('anterior'), moneda)
  const hayAnt = ant.rn > 0
  const titulo = periodo === 'mes' ? `${MESES_LARGOS[mes]} ${p.anio}` : periodo === 'acumulado' ? `enero a ${MESES_LARGOS[mes]} ${p.anio}` : `año ${p.anio}`
  const tarjetas: { t: string; a: number; b: number; c: number; f: (v: number) => string; pts?: boolean }[] = [
    { t: 'Ocupación', a: act.ocupacion, b: bud.ocupacion, c: ant.ocupacion, f: pct, pts: true },
    { t: 'Room nights', a: act.rn, b: bud.rn, c: ant.rn, f: entero },
    { t: `ADR ${moneda}`, a: act.adr, b: bud.adr, c: ant.adr, f: (v) => dinero(v, moneda) },
    { t: `RevPAR ${moneda}`, a: act.revpar, b: bud.revpar, c: ant.revpar, f: (v) => dinero(v, moneda) },
    { t: `Revenue ${moneda}`, a: act.revenue, b: bud.revenue, c: ant.revenue, f: (v) => dinero(v, moneda, true) },
  ]

  // evolución mensual del revenue
  const serie = Array.from({ length: 12 }, (_, m) => {
    const v = (esc: Escenario) => kpis(ctx.total(esc, ctx.cods, [m]), moneda).revenue
    return { mes: MESES[m], real: ctx.cerrados[m] ? v('real') : null, forecast: ctx.cerrados[m] ? null : v('forecast'), budget: v('budget'), anterior: hayAnt ? v('anterior') : null }
  })

  // segmentos con mayor desvío contra el Budget en el período
  const desvios = ctx.arbol.flatMap((c) => c.segmentos.map((s) => {
    const a = kpis(ctx.total('forecast', s.claves), moneda).revenue, b = kpis(ctx.total('budget', s.claves), moneda).revenue
    return { nombre: `${s.seg}`, cat: c.cat, dif: a - b, var: variacion(a, b) }
  })).filter((x) => Math.abs(x.dif) > 0).sort((x, y) => y.dif - x.dif)
  const arriba = desvios.filter((x) => x.dif > 0).slice(0, 5), abajo = desvios.filter((x) => x.dif < 0).slice(-5).reverse()

  // control contra Opera (H&F) en los meses cerrados del período
  const control = ctx.meses.filter((m) => ctx.cerrados[m] && p.opera[`${p.anio}-${String(m + 1).padStart(2, '0')}`])
  const rnOpera = control.reduce((s, m) => s + p.opera[`${p.anio}-${String(m + 1).padStart(2, '0')}`].rn, 0)
  const rnReal = control.length ? ctx.total('real', ctx.cods, control).rn : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold first-letter:uppercase">{titulo}</h2>
        <p className="text-xs text-neutral-500">{ctx.etiquetaActual} contra Budget{hayAnt ? ` y año anterior${p.previo && mesesConReal(p.previo).includes(false) ? ' (real + forecast de los meses sin cerrar)' : ''}` : ''}{moneda === 'ARS' ? ' · pesos al BNA vendedor promedio de cada mes (el Budget, a su tipo de cambio)' : ''}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tarjetas.map((t) => (
          <div key={t.t} className={`${sombra} p-4`}>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{t.t}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{t.f(t.a)}</div>
            <div className="text-[11px] text-neutral-500">{ctx.etiquetaActual}</div>
            <div className="mt-2 space-y-0.5 border-t border-neutral-100 pt-2 text-xs">
              <div className="flex justify-between gap-2"><span className="text-neutral-500">Budget {t.f(t.b)}</span><Delta v={t.pts ? t.a - t.b : variacion(t.a, t.b)} pts={t.pts} /></div>
              {hayAnt && <div className="flex justify-between gap-2"><span className="text-neutral-500">Año ant. {t.f(t.c)}</span><Delta v={t.pts ? t.a - t.c : variacion(t.a, t.c)} pts={t.pts} /></div>}
            </div>
          </div>
        ))}
      </div>

      <section className={`${sombra} p-5`}>
        <h3 className="mb-2 font-bold">Revenue por mes · {moneda}</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={serie} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#ececec" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => dinero(Number(v), moneda, true)} width={88} />
              <Tooltip formatter={(v) => (v === null ? '—' : dinero(Number(v), moneda))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="real" name="Real" stackId="a" fill="#1c1c1c" isAnimationActive={false} />
              <Bar dataKey="forecast" name="Forecast" stackId="a" fill="#a3a3a3" isAnimationActive={false} />
              <Line dataKey="budget" name="Budget" stroke="#b5121b" strokeWidth={2} dot={false} isAnimationActive={false} />
              {hayAnt && <Line dataKey="anterior" name="Año anterior" stroke="#2563eb" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {[['Por encima del Budget', arriba, 'text-emerald-700'], ['Por debajo del Budget', abajo, 'text-acento']].map(([t, lista, color]) => (
          <section key={t as string} className={`${sombra} p-5`}>
            <h3 className="mb-3 font-bold">{t as string} <span className="text-xs font-normal text-neutral-500">· segmentos, revenue {moneda}</span></h3>
            {(lista as typeof desvios).length === 0 ? <p className="text-sm text-neutral-500">Ninguno.</p> : (
              <div className="divide-y divide-neutral-100 text-sm">
                {(lista as typeof desvios).map((x) => (
                  <div key={x.cat + x.nombre} className="flex justify-between gap-3 py-1.5">
                    <span>{x.nombre} <span className="text-xs text-neutral-400">· {x.cat}</span></span>
                    <span className={`tabular-nums ${color as string}`}>{x.dif > 0 ? '+' : ''}{dinero(x.dif, moneda, true)} {x.var !== null && <span className="text-xs">({x.dif > 0 ? '+' : '-'}{pct(Math.abs(x.var))})</span>}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {control.length > 0 && rnOpera > 0 && (
        <p className={`rounded-lg px-3 py-2 text-xs ${Math.abs(rnReal - rnOpera) / rnOpera > 0.02 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
          Control con Opera (History &amp; Forecast): {entero(rnOpera)} noches vendidas en los meses cerrados del período contra {entero(rnReal)} del Real por segmento
          {Math.abs(rnReal - rnOpera) / rnOpera > 0.02 ? ` · diferencia de ${pct(Math.abs(rnReal - rnOpera) / rnOpera)}: conviene revisar la carga.` : ' · coinciden.'}
        </p>
      )}
    </div>
  )
}
