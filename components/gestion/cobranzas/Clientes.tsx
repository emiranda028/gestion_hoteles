'use client'
import { useMemo, useState } from 'react'
import { TRAMOS, type Antiguedad } from '@/lib/gestion/cobranzas/calculo'
import type { Listas } from '@/lib/gestion/cobranzas/modelo'
import { entrada } from '../comunes'
import type { FilaCliente } from './Cobranzas'
import { haceDias, pesos } from './formato'

const sel = 'rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm'

export default function ClientesTabla({ filas, total, listas, abrir }: {
  filas: FilaCliente[]; total: Antiguedad; listas: Listas; corte: string; abrir: (codigo: string) => void
}) {
  const [buscar, setBuscar] = useState('')
  const [resp, setResp] = useState('')
  const [estado, setEstado] = useState('')
  const [tipo, setTipo] = useState('')
  const [soloVencido, setSoloVencido] = useState(false)

  const usados = (f: (x: FilaCliente) => string | undefined, lista: string[]) =>
    [...new Set([...lista, ...filas.map(f).filter((x): x is string => !!x)])].sort()
  const visibles = useMemo(() => filas.filter((f) => {
    if (buscar && !`${f.cliente.nombre} ${f.codigo} ${f.cliente.cuit ?? ''}`.toLowerCase().includes(buscar.toLowerCase())) return false
    if (resp && (f.cliente.respCobranza || '—') !== resp) return false
    if (estado && (f.cliente.estado || '—') !== estado) return false
    if (tipo && (f.cliente.grupo ? 'grupo' : 'terceros') !== tipo) return false
    if (soloVencido && f.a.vencido <= 0) return false
    return true
  }), [filas, buscar, resp, estado, tipo, soloVencido])
  const suma = (k: keyof Antiguedad) => visibles.reduce((s, f) => s + (f.a[k] as number), 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar cliente, código o CUIT…" className={`${entrada} max-w-xs rounded-full`} />
        <select value={resp} onChange={(e) => setResp(e.target.value)} className={sel}>
          <option value="">Todos los responsables</option><option value="—">Sin responsable</option>
          {usados((f) => f.cliente.respCobranza, listas.respCobranza).map((x) => <option key={x}>{x}</option>)}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={sel}>
          <option value="">Todos los estados</option><option value="—">Sin estado</option>
          {usados((f) => f.cliente.estado, listas.estado).map((x) => <option key={x}>{x}</option>)}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={sel}>
          <option value="">Terceros y grupo</option><option value="terceros">Solo terceros</option><option value="grupo">Solo grupo</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={soloVencido} onChange={(e) => setSoloVencido(e.target.checked)} className="accent-[#b5121b]" /> Solo con deuda vencida</label>
      </div>

      <div className="tarjeta overflow-x-auto rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <table className="w-full min-w-[64rem] text-sm">
          <thead className="sticky top-0 border-b-2 border-marca bg-white text-left text-[11px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Cliente</th><th className="px-2">Responsable · estado</th>
              {TRAMOS.map((t) => <th key={t.k} className="px-2 text-right">{t.t}</th>)}
              <th className="px-2 text-right">Total</th><th className="px-3">Última gestión</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => {
              const d = haceDias(f.ultima?.fecha)
              return (
                <tr key={f.codigo} onClick={() => abrir(f.codigo)} className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-3 py-2">
                    <div className="font-semibold">{f.cliente.nombre}</div>
                    <div className="text-[11px] text-neutral-400">{f.codigo}{f.cliente.grupo ? ' · Grupo' : ''}{f.cliente.condicion ? ` · ${f.cliente.condicion}` : ''}</div>
                  </td>
                  <td className="px-2 text-xs">
                    <div>{f.cliente.respCobranza || <span className="text-neutral-400">Sin responsable</span>}</div>
                    <div className="text-neutral-500">{f.cliente.estado || '—'}</div>
                  </td>
                  {TRAMOS.map((t) => (
                    <td key={t.k} className={`px-2 text-right tabular-nums ${!f.a[t.k] ? 'text-neutral-300' : t.k === 'dmas' || t.k === 'd120' ? 'font-semibold text-acento' : ''}`}>
                      {f.a[t.k] ? pesos(f.a[t.k]) : '—'}
                    </td>
                  ))}
                  <td className="px-2 text-right font-bold tabular-nums">{pesos(f.a.total)}</td>
                  <td className="px-3 text-xs">
                    {f.ultima ? <><div className={d !== null && d > 15 && f.a.vencido > 0 ? 'font-semibold text-acento' : ''}>hace {d} días</div><div className="max-w-48 truncate text-neutral-500">{f.ultima.texto}</div></>
                      : <span className="text-neutral-400">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-marca font-bold">
            <tr>
              <td className="px-3 py-2" colSpan={2}>{visibles.length === filas.length ? 'Total' : `Total filtrado (${visibles.length} de ${filas.length})`}</td>
              {TRAMOS.map((t) => <td key={t.k} className="px-2 text-right tabular-nums">{pesos(suma(t.k))}</td>)}
              <td className="px-2 text-right tabular-nums">{pesos(suma('total'))}</td><td />
            </tr>
          </tfoot>
        </table>
      </div>
      {visibles.length === filas.length && Math.abs(suma('total') - total.total) > 1 && <p className="text-xs text-acento">Atención: los totales no cuadran con la base.</p>}
    </div>
  )
}
