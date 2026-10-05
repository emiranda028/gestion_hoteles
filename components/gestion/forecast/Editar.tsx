'use client'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { borrarVersion, guardarMes, guardarParametros, guardarVersion, importarBase, proyectarBudget, proyectarMesTotal } from '@/app/forecast/acciones'
import { arbol, celda, diasMes, mesesConReal } from '@/lib/gestion/forecast/calculo'
import { MESES, MESES_LARGOS, clave, type Celda, type CapaEditable } from '@/lib/gestion/forecast/modelo'
import { Boton, entrada, fechaCortaAR } from '../comunes'
import { Segmentado } from '../../ui'
import type { Props } from './Forecast'
import { dinero, entero, pct } from './formato'

const sombra = 'tarjeta rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]'
const celdaInput = 'w-full rounded border border-neutral-300 bg-white px-1.5 py-1 text-right text-sm tabular-nums outline-none focus:border-marca'

export default function Editar({ p }: { p: Props }) {
  const router = useRouter()
  const [aviso, setAviso] = useState('')
  const [pendiente, iniciar] = useTransition()
  const ejecutar = (fn: () => Promise<unknown>, ok: string) => iniciar(async () => {
    try { await fn(); router.refresh(); setAviso(ok) } catch (e) { setAviso((e as Error).message) }
    setTimeout(() => setAviso(''), 4000)
  })
  return (
    <div className="space-y-4">
      <Importar p={p} ejecutar={ejecutar} pendiente={pendiente} />
      {p.estructura.length > 0 && <>
        <EditorMes p={p} ejecutar={ejecutar} pendiente={pendiente} />
        {p.previo && <BudgetAutomatico p={p} ejecutar={ejecutar} pendiente={pendiente} />}
        <Versiones p={p} ejecutar={ejecutar} pendiente={pendiente} />
        <Parametros p={p} ejecutar={ejecutar} pendiente={pendiente} />
      </>}
      {aviso && <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-marca px-4 py-2 text-sm text-white shadow-lg">{aviso}</div>}
    </div>
  )
}

type Ejec = { ejecutar: (fn: () => Promise<unknown>, ok: string) => void; pendiente: boolean }

function Importar({ p, ejecutar, pendiente }: { p: Props } & Ejec) {
  const archivo = useRef<HTMLInputElement>(null)
  const [capa, setCapa] = useState<CapaEditable>('real')
  const [resultado, setResultado] = useState('')
  const subir = () => {
    const f = archivo.current?.files?.[0]
    if (!f) return
    const fd = new FormData()
    fd.set('hotel', p.hotel.id); fd.set('anio', String(p.anio)); fd.set('capa', capa); fd.set('archivo', f)
    ejecutar(async () => {
      const r = await importarBase(fd)
      setResultado(`${r.codigos} códigos importados${r.nuevos ? ` (${r.nuevos} nuevos, sumados a la estructura)` : ''} · meses: ${r.meses.join(', ') || '—'}`)
      if (archivo.current) archivo.current.value = ''
    }, 'Importación aplicada')
  }
  const imp = p.actual.importado
  return (
    <section className={sombra}>
      <h2 className="font-bold">Cargar planillas · {p.anio}</h2>
      <p className="mt-1 text-sm text-neutral-500">El formato de siempre (Market Category, Segment, Prefix y RN/ADR/Revenue por mes). Si aparece un código nuevo, se agrega solo: no se descarta ninguna fila. El Real se carga mes a mes y siempre manda sobre el Forecast.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Segmentado valor={capa} onChange={setCapa} opciones={[{ valor: 'real', texto: 'Real' }, { valor: 'budget', texto: 'Budget' }, { valor: 'forecast', texto: 'Forecast' }]} />
        <input ref={archivo} type="file" accept=".xlsx,.xlsm" onChange={subir} disabled={pendiente}
          className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-marca file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
      </div>
      {resultado && <p className="mt-2 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{resultado}</p>}
      <div className="mt-3 grid gap-2 text-xs text-neutral-500 sm:grid-cols-3">
        {(['real', 'budget', 'forecast'] as CapaEditable[]).map((c) => (
          <div key={c} className="rounded-lg bg-neutral-50 px-3 py-2">
            <div className="font-semibold capitalize text-neutral-700">{c === 'real' ? 'Real' : c === 'budget' ? 'Budget' : 'Forecast'}</div>
            {imp[c] ? <>{imp[c]!.archivo} · {fechaCortaAR(imp[c]!.fecha)} · {imp[c]!.por}</> : 'Sin importar'}
            <div className="mt-1"><a className="text-marca underline" href={`/forecast/descargar?hotel=${p.hotel.id}&anio=${p.anio}&capa=${c}`}>Descargar en Excel</a></div>
          </div>
        ))}
      </div>
      <a href={`/forecast/descargar?hotel=${p.hotel.id}&anio=${p.anio}&capa=vacia`} className="mt-2 inline-block text-sm text-marca underline">Plantilla vacía</a>
    </section>
  )
}

function EditorMes({ p, ejecutar, pendiente }: { p: Props } & Ejec) {
  const cerrados = mesesConReal(p.actual)
  const primerAbierto = Math.max(0, cerrados.indexOf(false))
  const [capa, setCapa] = useState<'forecast' | 'budget'>('forecast')
  const [mes, setMes] = useState(primerAbierto)
  const cods = p.estructura.map(clave)
  const ref = (k: string, esc: 'budget' | 'anterior' | 'forecast') => celda(esc, k, mes, p.actual, p.previo, cerrados)
  const inicial = useMemo(() => Object.fromEntries(cods.map((k) => {
    const propio = capa === 'forecast' ? p.actual.forecast[k]?.[mes] : p.actual.budget[k]?.[mes]
    return [k, propio ? [String(propio[0]), String(propio[1])] : ['', '']]
  })), [p, capa, mes]) // eslint-disable-line react-hooks/exhaustive-deps
  const [valores, setValores] = useState<Record<string, string[]>>(inicial)
  const [base, setBase] = useState(inicial)
  if (base !== inicial) { setBase(inicial); setValores(inicial) }
  const [total, setTotal] = useState({ rn: '', adr: '', ref: 'budget' as 'budget' | 'anterior' })
  const bloqueado = capa === 'forecast' && cerrados[mes]

  // valor efectivo de cada código: lo cargado o, si está vacío, la referencia (el Budget para el forecast)
  const efectivo = (k: string): Celda => {
    const [rn, adr] = valores[k] ?? ['', '']
    if (rn === '' && capa === 'forecast') return ref(k, 'budget')
    return [Number(rn) || 0, Number(adr) || 0]
  }
  const totRn = cods.reduce((s, k) => s + efectivo(k)[0], 0), totRev = cods.reduce((s, k) => s + efectivo(k)[0] * efectivo(k)[1], 0)
  const disp = (p.actual.inventario[mes] ?? 0) * diasMes(p.anio, mes)
  const guardar = () => ejecutar(() => guardarMes(p.hotel.id, p.anio, capa, mes, Object.fromEntries(cods.map((k) => {
    const [rn, adr] = valores[k] ?? ['', '']
    return [k, rn === '' ? null : [Number(rn) || 0, Number(adr) || 0] as Celda]
  }))), 'Mes guardado')

  return (
    <section className={sombra}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Editar por mes</h2>
          <p className="mt-1 text-sm text-neutral-500">{capa === 'forecast' ? 'Los códigos vacíos toman el Budget del mes. En los meses con Real no se edita: manda el Real.' : `Budget ${p.anio}: noches y ADR por código.`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmentado valor={capa} onChange={setCapa} opciones={[{ valor: 'forecast', texto: 'Forecast' }, { valor: 'budget', texto: 'Budget' }]} />
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm">
            {MESES_LARGOS.map((m, i) => <option key={m} value={i}>{m}{cerrados[i] ? ' · con Real' : ''}</option>)}
          </select>
        </div>
      </div>

      {bloqueado ? <p className="mt-4 rounded bg-neutral-50 p-4 text-sm text-neutral-600">{MESES_LARGOS[mes]} ya tiene Real cargado: el forecast de ese mes es el Real.</p> : (
        <>
          {capa === 'forecast' && (
            <div className="mt-4 rounded-lg border border-dashed border-neutral-300 p-3">
              <div className="text-sm font-semibold">Proyectar {MESES_LARGOS[mes]} desde el total del mes</div>
              <p className="text-xs text-neutral-500">Cargá las noches y el ADR esperados (on the books + pickup). Se reparten entre los códigos con la mezcla de referencia y el ingreso cierra exacto.</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-xs text-neutral-600">Noches<input type="number" value={total.rn} onChange={(e) => setTotal({ ...total, rn: e.target.value })} className={`${entrada} w-28`} /></label>
                <label className="text-xs text-neutral-600">ADR US$<input type="number" value={total.adr} onChange={(e) => setTotal({ ...total, adr: e.target.value })} className={`${entrada} w-28`} /></label>
                <label className="text-xs text-neutral-600">Mezcla según
                  <select value={total.ref} onChange={(e) => setTotal({ ...total, ref: e.target.value as 'budget' | 'anterior' })} className={entrada}>
                    <option value="budget">Budget del mes</option>{p.previo && <option value="anterior">Real del año anterior</option>}
                  </select>
                </label>
                <Boton tipo="principal" disabled={pendiente || !total.rn || !total.adr}
                  onClick={() => ejecutar(() => proyectarMesTotal(p.hotel.id, p.anio, mes, Number(total.rn), Number(total.adr), total.ref), `${MESES_LARGOS[mes]} proyectado`)}>Proyectar</Boton>
                {total.rn && disp > 0 && <span className="pb-2 text-xs text-neutral-500">= {pct(Number(total.rn) / disp)} de ocupación</span>}
              </div>
            </div>
          )}

          <div className="mt-4 max-h-[60vh] overflow-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="sticky top-0 z-10 bg-white text-right text-[11px] uppercase tracking-wide text-neutral-500 shadow-[0_1px_0_#e5e5e5]">
                <tr>
                  <th className="px-3 py-2 text-left">Código</th><th className="w-24 px-1">Noches</th><th className="w-24 px-1">ADR US$</th><th className="px-2">Revenue</th>
                  {capa === 'forecast' && <th className="px-2 text-acento">Budget</th>}
                  {p.previo && <th className="px-2 text-blue-700">Año ant.</th>}
                </tr>
              </thead>
              <tbody>
                {arbol(p.estructura).map((c) => c.segmentos.map((s) => s.codigos.map((x, i) => {
                  const k = clave(x), v = valores[k] ?? ['', ''], ef = efectivo(k), b = ref(k, 'budget'), a = ref(k, 'anterior')
                  return (
                    <tr key={k} className="border-t border-neutral-100">
                      <td className="px-3 py-1">
                        {i === 0 && <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{c.cat} · {s.seg}</div>}
                        <span className="font-mono text-xs text-neutral-500">{x.cod}</span> {x.desc}
                      </td>
                      <td className="px-1"><input value={v[0]} placeholder={capa === 'forecast' ? String(b[0]) : ''} inputMode="numeric"
                        onChange={(e) => setValores({ ...valores, [k]: [e.target.value, v[1] || (capa === 'forecast' ? String(b[1]) : '')] })} className={celdaInput} /></td>
                      <td className="px-1"><input value={v[1]} placeholder={capa === 'forecast' ? String(b[1]) : ''} inputMode="decimal"
                        onChange={(e) => setValores({ ...valores, [k]: [v[0], e.target.value] })} className={celdaInput} /></td>
                      <td className={`px-2 text-right tabular-nums ${v[0] === '' && capa === 'forecast' ? 'text-neutral-400' : ''}`}>{dinero(ef[0] * ef[1], 'USD')}</td>
                      {capa === 'forecast' && <td className="px-2 text-right text-xs tabular-nums text-neutral-500">{entero(b[0])} · {dinero(b[1], 'USD')}</td>}
                      {p.previo && <td className="px-2 text-right text-xs tabular-nums text-neutral-500">{entero(a[0])} · {dinero(a[1], 'USD')}</td>}
                    </tr>
                  )
                })))}
              </tbody>
              <tfoot className="sticky bottom-0 border-t-2 border-marca bg-white font-bold">
                <tr>
                  <td className="px-3 py-2">Total {MESES_LARGOS[mes]}</td>
                  <td className="px-1 text-right tabular-nums">{entero(totRn)}</td>
                  <td className="px-1 text-right tabular-nums">{dinero(totRn ? totRev / totRn : 0, 'USD')}</td>
                  <td className="px-2 text-right tabular-nums">{dinero(totRev, 'USD')}</td>
                  <td className="px-2 text-right text-xs font-normal text-neutral-500" colSpan={2}>Ocupación {disp ? pct(totRn / disp) : '—'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {capa === 'forecast' && <Boton disabled={pendiente} onClick={() => setValores(Object.fromEntries(cods.map((k) => [k, ['', '']])))}>Volver todo al Budget</Boton>}
            <Boton tipo="principal" disabled={pendiente} onClick={guardar}>Guardar {MESES_LARGOS[mes]}</Boton>
          </div>
        </>
      )}
    </section>
  )
}

function BudgetAutomatico({ p, ejecutar, pendiente }: { p: Props } & Ejec) {
  const [base, setBase] = useState<'forecast' | 'real'>('forecast')
  const [rn, setRn] = useState('3')
  const [adr, setAdr] = useState('5')
  const tiene = Object.keys(p.actual.budget).length > 0
  return (
    <section className={sombra}>
      <h2 className="font-bold">Armar el Budget {p.anio} automáticamente</h2>
      <p className="mt-1 text-sm text-neutral-500">Parte de {base === 'forecast' ? `el forecast ${p.anio - 1} (Real de los meses cerrados + proyección)` : `el Real ${p.anio - 1}`}, código por código y mes por mes, y aplica los ajustes. Después se puede retocar con el editor.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-neutral-600">Base
          <select value={base} onChange={(e) => setBase(e.target.value as 'forecast' | 'real')} className={entrada}>
            <option value="forecast">Forecast {p.anio - 1}</option><option value="real">Real {p.anio - 1}</option>
          </select>
        </label>
        <label className="text-xs text-neutral-600">Noches (%)<input type="number" step="0.5" value={rn} onChange={(e) => setRn(e.target.value)} className={`${entrada} w-24`} /></label>
        <label className="text-xs text-neutral-600">Tarifa (%)<input type="number" step="0.5" value={adr} onChange={(e) => setAdr(e.target.value)} className={`${entrada} w-24`} /></label>
        <Boton tipo="principal" disabled={pendiente} onClick={() => {
          if (tiene && !confirm(`Ya hay un Budget ${p.anio}. ¿Reemplazarlo?`)) return
          ejecutar(() => proyectarBudget(p.hotel.id, p.anio, base, Number(rn) / 100, Number(adr) / 100), `Budget ${p.anio} armado`)
        }}>Armar Budget</Boton>
      </div>
      <p className="mt-2 text-xs text-neutral-500">Ingresos esperados ≈ base × (1 + noches) × (1 + tarifa).</p>
    </section>
  )
}

function Versiones({ p, ejecutar, pendiente }: { p: Props } & Ejec) {
  const [nombre, setNombre] = useState('')
  const cerrados = mesesConReal(p.actual)
  const cods = p.estructura.map(clave)
  const revActual = cods.reduce((s, k) => s + Array.from({ length: 12 }, (_, m) => celda('forecast', k, m, p.actual, p.previo, cerrados)).reduce((x, [rn, adr]) => x + rn * adr, 0), 0)
  return (
    <section className={sombra}>
      <h2 className="font-bold">Versiones del forecast</h2>
      <p className="mt-1 text-sm text-neutral-500">Guardá una foto del forecast (por ejemplo, el de cada cierre de mes) para compararlo después con lo que pasó.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={`Forecast ${MESES_LARGOS[Math.max(0, cerrados.lastIndexOf(true))]} ${p.anio}`} className={`${entrada} max-w-xs`} />
        <Boton tipo="principal" disabled={pendiente} onClick={() => { ejecutar(() => guardarVersion(p.hotel.id, p.anio, nombre), 'Versión guardada'); setNombre('') }}>Guardar versión</Boton>
      </div>
      {p.actual.versiones.length > 0 && (
        <div className="mt-3 divide-y divide-neutral-100 text-sm">
          {p.actual.versiones.map((v) => {
            const rev = Object.values(v.forecast).reduce((s, fila) => s + fila.reduce((x, c) => x + (c ? c[0] * c[1] : 0), 0), 0)
            const d = revActual - rev
            return (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><strong>{v.nombre}</strong> <span className="text-xs text-neutral-500">· {fechaCortaAR(v.fecha)} · {v.por}</span></span>
                <span className="flex items-center gap-3 tabular-nums">
                  {dinero(rev, 'USD', true)}
                  <span className={`text-xs ${d >= 0 ? 'text-emerald-700' : 'text-acento'}`}>hoy {d >= 0 ? '+' : ''}{dinero(d, 'USD', true)}</span>
                  <button className="text-xs text-neutral-400 underline hover:text-acento" onClick={() => confirm('¿Borrar la versión?') && ejecutar(() => borrarVersion(p.hotel.id, p.anio, v.id), 'Versión borrada')}>Borrar</button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Parametros({ p, ejecutar, pendiente }: { p: Props } & Ejec) {
  const [inv, setInv] = useState(p.actual.inventario.map(String))
  const [tc, setTc] = useState(p.actual.tcBudget.map((x) => (x ? String(x) : '')))
  const bna = (m: number) => p.tc[`${p.anio}-${String(m + 1).padStart(2, '0')}`]
  return (
    <section className={sombra}>
      <h2 className="font-bold">Habitaciones y tipo de cambio · {p.anio}</h2>
      <p className="mt-1 text-sm text-neutral-500">Habitaciones disponibles por mes (para ocupación y RevPAR) y el tipo de cambio del Budget. En los meses reales se usa el dólar BNA vendedor promedio del mes, el mismo del resto de la plataforma.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-neutral-500"><tr><th className="py-1 text-left" />{MESES.map((m) => <th key={m} className="px-1">{m}</th>)}</tr></thead>
          <tbody>
            <tr><td className="pr-2 text-xs">Habitaciones</td>{inv.map((v, m) => <td key={m} className="px-0.5"><input value={v} onChange={(e) => setInv(inv.map((x, i) => (i === m ? e.target.value : x)))} className={celdaInput} /></td>)}</tr>
            <tr><td className="pr-2 text-xs">TC Budget</td>{tc.map((v, m) => <td key={m} className="px-0.5"><input value={v} placeholder="—" onChange={(e) => setTc(tc.map((x, i) => (i === m ? e.target.value : x)))} className={celdaInput} /></td>)}</tr>
            <tr className="text-xs text-neutral-500"><td className="pr-2">BNA real</td>{Array.from({ length: 12 }, (_, m) => <td key={m} className="px-1 text-right tabular-nums">{bna(m) ? entero(bna(m)) : '—'}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex justify-end">
        <Boton tipo="principal" disabled={pendiente} onClick={() => ejecutar(() => guardarParametros(p.hotel.id, p.anio, inv.map(Number), tc.map((x) => (x ? Number(x) : null))), 'Parámetros guardados')}>Guardar</Boton>
      </div>
    </section>
  )
}
