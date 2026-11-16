'use client'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { fijarPrevista } from '@/app/cobranzas/acciones'
import { destino, prevision, semanas, type Prevision } from '@/lib/gestion/cobranzas/calculo'
import { Boton, fechaCortaAR } from '../comunes'
import type { FilaCliente } from './Cobranzas'
import { pesos } from './formato'

export default function PrevisionVista({ hotel, filas, prev, corte, previstas, abrir }: {
  hotel: string; filas: FilaCliente[]; prev: Prevision; corte: string; previstas: Record<string, string>; abrir: (codigo: string) => void
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const sem = semanas(corte)
  const porCliente = useMemo(() => filas.map((f) => ({ f, p: prevision(f.facturas, corte, previstas) }))
    .sort((x, y) => (y.p.sinFecha + y.p.atrasada) - (x.p.sinFecha + x.p.atrasada) || y.p.total - x.p.total), [filas, corte, previstas])
  const sinFecha = filas.flatMap((f) => f.facturas).filter((x) => destino(x, corte, previstas[x.id]) === 'sinFecha')
  const cols = [
    { t: 'Vencida sin fecha', v: (p: Prevision) => p.sinFecha, alerta: true },
    { t: 'Promesa vencida', v: (p: Prevision) => p.atrasada, alerta: true },
    ...sem.map((s, i) => ({ t: `Semana ${i + 1}`, sub: `${fechaCortaAR(s.desde).slice(0, 5)} al ${fechaCortaAR(s.hasta).slice(0, 5)}`, v: (p: Prevision) => p.semanas[i] })),
    { t: 'Más adelante', v: (p: Prevision) => p.despues },
  ] as { t: string; sub?: string; v: (p: Prevision) => number; alerta?: boolean }[]

  const [colMovil, setColMovil] = useState(2)
  const vis = (i: number) => (i === colMovil ? '' : 'hidden md:table-cell')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-neutral-500">
          Cada factura va a la semana de su <strong>fecha prevista de cobro</strong> (si se cargó) o de su vencimiento. Las vencidas sin fecha no se reparten solas:
          quedan a la vista hasta que alguien registre una promesa de pago o fije una fecha desde la ficha del cliente.
        </p>
        {sinFecha.length > 0 && (
          <Boton disabled={pendiente} onClick={() => {
            if (!confirm(`¿Fijar la semana 1 (${fechaCortaAR(sem[0].hasta)}) como fecha prevista de las ${sinFecha.length} facturas vencidas sin fecha?`)) return
            iniciar(async () => { await fijarPrevista(hotel, sinFecha.map((x) => x.id), sem[0].hasta); router.refresh() })
          }}>Llevar las vencidas sin fecha a la semana 1</Boton>
        )}
      </div>
      <label className="flex items-center gap-2 text-xs text-neutral-500 md:hidden">Ver
        <select value={colMovil} onChange={(e) => setColMovil(Number(e.target.value))}
          className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900">
          {cols.map((c, i) => <option key={c.t} value={i}>{c.t}{c.sub ? ` (${c.sub})` : ''}</option>)}
        </select>
      </label>
      <div className="tarjeta overflow-x-auto rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <table className="w-full text-sm md:min-w-[64rem]">
          <thead className="border-b-2 border-marca text-left text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Cliente</th>
              {cols.map((c, i) => <th key={c.t} className={`px-2 text-right ${vis(i)} ${c.alerta ? 'text-acento' : ''}`}>{c.t}{c.sub && <div className="font-normal normal-case tracking-normal text-neutral-400">{c.sub}</div>}</th>)}
              <th className="px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {porCliente.map(({ f, p }) => (
              <tr key={f.codigo} onClick={() => abrir(f.codigo)} className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-1.5 font-medium">{f.cliente.nombre}</td>
                {cols.map((c, i) => {
                  const v = c.v(p)
                  return <td key={c.t} className={`px-2 text-right tabular-nums ${vis(i)} ${!v ? 'text-neutral-300' : c.alerta ? 'font-semibold text-acento' : ''}`}>{v ? pesos(v) : '—'}</td>
                })}
                <td className="px-3 text-right font-semibold tabular-nums">{pesos(p.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-marca font-bold">
            <tr>
              <td className="px-3 py-2">Total</td>
              {cols.map((c, i) => <td key={c.t} className={`px-2 text-right tabular-nums ${vis(i)} ${c.alerta && c.v(prev) ? 'text-acento' : ''}`}>{pesos(c.v(prev))}</td>)}
              <td className="px-3 text-right tabular-nums">{pesos(prev.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
