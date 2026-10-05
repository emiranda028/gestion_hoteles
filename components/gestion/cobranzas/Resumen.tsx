'use client'
import { TRAMOS, antiguedad, semanas, type Antiguedad, type Prevision } from '@/lib/gestion/cobranzas/calculo'
import { fechaCortaAR } from '../comunes'
import type { FilaCliente } from './Cobranzas'
import { COLOR_TRAMO, haceDias, millones, pesos } from './formato'

const sombra = 'tarjeta rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]'

function Kpi({ t, v, sub, color }: { t: string; v: string; sub?: string; color?: string }) {
  return (
    <div className={`${sombra} p-4`}>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{t}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>{v}</div>
      {sub && <div className="mt-0.5 text-xs text-neutral-500">{sub}</div>}
    </div>
  )
}

/** Barra apilada por tramo de antigüedad. */
function BarraTramos({ a }: { a: Antiguedad }) {
  const pos = TRAMOS.map((t) => Math.max(0, a[t.k]))
  const suma = pos.reduce((s, x) => s + x, 0) || 1
  return (
    <div className="flex h-5 w-full overflow-hidden rounded">
      {TRAMOS.map((t, i) => pos[i] > 0 && (
        <div key={t.k} title={`${t.t}: ${pesos(a[t.k])}`} style={{ width: `${(pos[i] / suma) * 100}%`, background: COLOR_TRAMO[t.k] }} />
      ))}
    </div>
  )
}

function agrupar(filas: FilaCliente[], clave: (f: FilaCliente) => string) {
  const m = new Map<string, FilaCliente[]>()
  for (const f of filas) m.set(clave(f), [...(m.get(clave(f)) ?? []), f])
  return [...m].map(([k, fs]) => ({ k, fs }))
}

export default function ResumenCobranzas({ filas, total, prev, corte, abrir }: {
  filas: FilaCliente[]; total: Antiguedad; prev: Prevision; corte: string; abrir: (codigo: string, vista?: 'facturas' | 'gestiones') => void
}) {
  const terceros = filas.filter((f) => !f.cliente.grupo), grupo = filas.filter((f) => f.cliente.grupo)
  const at = antiguedad(terceros.flatMap((f) => f.facturas), corte), ag = antiguedad(grupo.flatMap((f) => f.facturas), corte)
  const conCorte = (fs: FilaCliente[]) => antiguedad(fs.flatMap((x) => x.facturas), corte)
  const porResp = agrupar(filas, (f) => f.cliente.respCobranza || 'Sin asignar').map((x) => ({ ...x, a: conCorte(x.fs) })).sort((x, y) => y.a.total - x.a.total)
  const porEstado = agrupar(filas, (f) => f.cliente.estado || 'Sin estado').map((x) => ({ ...x, a: conCorte(x.fs) })).sort((x, y) => y.a.total - x.a.total)
  const porCond = agrupar(filas, (f) => (f.cliente.grupo ? 'Grupo' : f.cliente.condicion || 'Sin condición')).map((x) => ({ ...x, a: conCorte(x.fs) })).sort((x, y) => y.a.total - x.a.total)
  const sem = semanas(corte)
  const prev5 = prev.semanas.reduce((s, x) => s + x, 0)
  // clientes con deuda vencida y sin gestión en los últimos 15 días: la lista de trabajo del día
  const atencion = filas.filter((f) => f.a.vencido > 0 && (haceDias(f.ultima?.fecha) ?? 999) > 15).sort((x, y) => y.a.vencido - x.a.vencido).slice(0, 8)
  const maxResp = Math.max(...porResp.map((x) => x.a.total), 1)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi t="Deuda total" v={millones(total.total)} sub={`${total.facturas} comprobantes`} />
        <Kpi t="Vencida" v={millones(total.vencido)} sub={`${total.total ? Math.round((total.vencido / total.total) * 100) : 0}% del total`} color="#b45309" />
        <Kpi t="Más de 90 días" v={millones(total.mas90)} sub={`${total.total ? Math.round((total.mas90 / total.total) * 100) : 0}% del total`} color="#b5121b" />
        <Kpi t="Cobro previsto" v={millones(prev5)} sub={`próximas 5 semanas (${fechaCortaAR(sem[0].desde)} al ${fechaCortaAR(sem[4].hasta)})`} color="#15803d" />
        <Kpi t="Vencida sin fecha de cobro" v={millones(prev.sinFecha + prev.atrasada)} sub="hay que gestionarla" color={prev.sinFecha + prev.atrasada > 0 ? '#b5121b' : undefined} />
      </div>

      <section className={`${sombra} p-5`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Antigüedad de la deuda</h2>
          <div className="flex flex-wrap gap-3 text-xs text-neutral-600">
            {TRAMOS.map((t) => <span key={t.k} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_TRAMO[t.k] }} />{t.t}</span>)}
          </div>
        </div>
        <div className="space-y-3">
          {[['Terceros', at], ['Grupo (management e intercompany)', ag], ['Total', total]].map(([t, a]) => (a as Antiguedad).facturas > 0 && (
            <div key={t as string} className="grid items-center gap-2 sm:grid-cols-[13rem_1fr_9rem]">
              <span className="text-sm font-semibold">{t as string}</span>
              <BarraTramos a={a as Antiguedad} />
              <span className="text-right text-sm font-bold tabular-nums">{pesos((a as Antiguedad).total)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b-2 border-marca text-left text-[11px] uppercase tracking-wide text-neutral-500">
              <tr><th className="py-2">Condición</th>{TRAMOS.map((t) => <th key={t.k} className="text-right">{t.t}</th>)}<th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {porCond.map((x) => (
                <tr key={x.k} className="border-b border-neutral-100">
                  <td className="py-1.5">{x.k} <span className="text-xs text-neutral-400">· {x.fs.length}</span></td>
                  {TRAMOS.map((t) => <td key={t.k} className={`text-right tabular-nums ${x.a[t.k] ? '' : 'text-neutral-300'}`}>{x.a[t.k] ? pesos(x.a[t.k]) : '—'}</td>)}
                  <td className="text-right font-semibold tabular-nums">{pesos(x.a.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${sombra} p-5`}>
          <h2 className="mb-1 font-bold">Por responsable de cobranza</h2>
          <p className="mb-3 text-xs text-neutral-500"><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-acento" />vencido · <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-neutral-300" />a vencer</p>
          <div className="space-y-2.5">
            {porResp.map((x) => (
              <div key={x.k} className="text-sm">
                <div className="flex justify-between"><span>{x.k} <span className="text-xs text-neutral-400">· {x.fs.length} clientes</span></span><span className="font-semibold tabular-nums">{pesos(x.a.total)}</span></div>
                <div className="mt-1 flex h-2.5 overflow-hidden rounded bg-neutral-100">
                  <div className="bg-acento" style={{ width: `${(Math.max(0, x.a.vencido) / maxResp) * 100}%` }} />
                  <div className="bg-neutral-300" style={{ width: `${(Math.max(0, x.a.avencer) / maxResp) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className={`${sombra} p-5`}>
          <h2 className="mb-3 font-bold">Por estado de gestión</h2>
          <div className="divide-y divide-neutral-100 text-sm">
            {porEstado.map((x) => (
              <div key={x.k} className="flex items-center justify-between gap-3 py-1.5">
                <span>{x.k} <span className="text-xs text-neutral-400">· {x.fs.length}</span></span>
                <span className="flex items-center gap-3 tabular-nums">
                  {x.a.vencido > 0 && <span className="text-xs text-acento">{pesos(x.a.vencido)} vencido</span>}
                  <strong>{pesos(x.a.total)}</strong>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={`${sombra} p-5`}>
        <h2 className="font-bold">Para gestionar hoy</h2>
        <p className="mb-3 text-xs text-neutral-500">Clientes con deuda vencida y sin gestión registrada en los últimos 15 días, de mayor a menor.</p>
        {atencion.length === 0 ? <p className="text-sm text-neutral-500">Todos los clientes con deuda vencida tienen gestión reciente. 👏</p> : (
          <div className="divide-y divide-neutral-100">
            {atencion.map((f) => {
              const d = haceDias(f.ultima?.fecha)
              return (
                <button key={f.codigo} onClick={() => abrir(f.codigo, 'gestiones')} className="grid w-full items-center gap-x-4 py-2 text-left text-sm hover:bg-neutral-50 sm:grid-cols-[1fr_9rem_10rem_8rem]">
                  <span className="font-semibold">{f.cliente.nombre}</span>
                  <span className="text-xs text-neutral-500">{f.cliente.respCobranza || 'Sin responsable'}</span>
                  <span className="text-xs">{d === null ? <span className="text-acento">Nunca gestionado</span> : `Última gestión hace ${d} días`}</span>
                  <span className="text-right font-semibold tabular-nums text-acento">{pesos(f.a.vencido)}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
