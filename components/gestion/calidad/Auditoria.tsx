'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { cambiarEstado, eliminarAuditoria, guardarAccion, quitarEvidencia, responder, subirEvidencia } from '@/app/calidad/acciones'
import { accionesAbiertas, itemsDe, nodosPlan, porCategoria, prioridad, puntajeItem, resumirItems, semaforo, type Resumen } from '@/lib/gestion/calidad/calculo'
import { ESTADOS_ACCION, OBJETIVO, type Accion, type Auditoria, type Item, type Nodo, type Programa, type Respuesta } from '@/lib/gestion/calidad/modelo'
import { Medidor } from '../../ResumenEjecutivo'
import { Barra, Boton, Modal, Pestanas, Pildora, entrada, fechaCortaAR, pct0, pct1 } from '../comunes'

type Props = {
  hotel: string; programa: Programa; auditoria: Auditoria
  comparacion: { titulo: string; porNodo: Record<string, number | null>; global: number | null } | null
  usuario: { nombre: string; rol: string }
}
type Vista = 'evaluar' | 'resultados' | 'plan'

export default function AuditoriaVista({ hotel, programa: prog, auditoria: inicial, comparacion, usuario }: Props) {
  const router = useRouter()
  const [a, setA] = useState(inicial)
  const [vista, setVista] = useState<Vista>(inicial.estado === 'cerrada' ? 'resultados' : 'evaluar')
  const [aviso, setAviso] = useState('')
  const [pendiente, iniciar] = useTransition()
  const cerrada = a.estado === 'cerrada'
  const total = useMemo(() => resumirItems(prog, prog.nodos.flatMap(itemsDe), a.respuestas), [prog, a.respuestas])
  const s = semaforo(total.cumplimiento)
  const abiertas = accionesAbiertas(prog, a.respuestas, a.plan)

  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(''), 3500) }

  // guardado optimista: se ve al instante y se confirma en el servidor
  const actualizar = (item: string, cambio: Partial<Respuesta>) => {
    const previo = a.respuestas[item]
    const nuevo: Respuesta = { ...previo, ...cambio, por: usuario.nombre }
    if (cambio.na) delete nuevo.o
    if (cambio.o) delete nuevo.na
    setA((x) => ({ ...x, respuestas: { ...x.respuestas, [item]: nuevo } }))
    responder(a.hotel, a.id, item, cambio).catch((e: Error) => {
      setA((x) => ({ ...x, respuestas: { ...x.respuestas, [item]: previo } }))
      avisar(e.message)
    })
  }

  const cambiar = (estado: 'borrador' | 'cerrada') => iniciar(async () => {
    try {
      await cambiarEstado(a.hotel, a.id, estado)
      setA((x) => ({ ...x, estado }))
      if (estado === 'cerrada') setVista('resultados')
    } catch (e) { avisar((e as Error).message) }
  })

  return (
    <div className="space-y-5">
      <div className="no-imprimir">
        <Link href={`/calidad?hotel=${a.hotel}`} className="text-sm text-neutral-500 hover:text-neutral-900">← Calidad</Link>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-acento">{prog.nombre} · {hotel}</div>
          <h1 className="titulo mt-1">{a.titulo}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {a.periodo || '—'} · {fechaCortaAR(a.fecha)} · Auditor: {a.auditor}
            {cerrada && a.cerradaPor && <> · Cerrada por {a.cerradaPor} el {fechaCortaAR(a.cerrada ?? '')}</>}
          </p>
        </div>
        <div className="no-imprimir flex flex-wrap gap-2">
          <Boton onClick={() => window.print()}>Imprimir</Boton>
          {!cerrada && <Boton tipo="principal" disabled={pendiente} onClick={() => {
            if (total.cobertura < 1 && !confirm(`Falta evaluar ${total.aplicables - total.respondidos} ítems. ¿Cerrar igual? Lo no evaluado no cuenta en el cumplimiento.`)) return
            cambiar('cerrada')
          }}>Cerrar auditoría</Boton>}
          {cerrada && usuario.rol !== 'cliente' && <Boton disabled={pendiente} onClick={() => cambiar('borrador')}>Reabrir</Boton>}
          {usuario.rol === 'admin' && <Boton tipo="peligro" disabled={pendiente} onClick={() => {
            if (!confirm('¿Eliminar esta auditoría con sus respuestas y evidencias? No se puede deshacer.')) return
            iniciar(async () => { await eliminarAuditoria(a.hotel, a.id); router.push(`/calidad?hotel=${a.hotel}`) })
          }}>Eliminar</Boton>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Cumplimiento" valor={pct1(total.cumplimiento)} color={s.color} extra={<Pildora {...s} />} />
        <Kpi titulo="Evaluado" valor={pct0(total.cobertura)} extra={<div className="mt-1"><Barra valor={total.cobertura} /><div className="mt-1 text-[11px] text-neutral-500">{total.respondidos} de {total.aplicables} ítems</div></div>} />
        <Kpi titulo="No cumplen" valor={String(total.noCumple)} color={total.noCumple ? '#b5121b' : undefined} extra={<div className="text-[11px] text-neutral-500">ítems por debajo del 50%</div>} />
        <Kpi titulo="Acciones abiertas" valor={String(abiertas)} extra={<div className="text-[11px] text-neutral-500">objetivo {pct0(OBJETIVO)}</div>} />
      </div>

      <div className="no-imprimir">
        <Pestanas valor={vista} onChange={setVista} opciones={[
          { valor: 'evaluar', texto: cerrada ? 'Respuestas' : 'Evaluar' },
          { valor: 'resultados', texto: 'Resultados' },
          { valor: 'plan', texto: 'Plan de acción', extra: abiertas ? <span className="rounded-full bg-acento px-1.5 text-[10px] font-bold text-white">{abiertas}</span> : null },
        ]} />
      </div>

      {vista === 'evaluar' && <Evaluar prog={prog} a={a} soloLectura={cerrada} actualizar={actualizar} setA={setA} avisar={avisar} />}
      {vista === 'resultados' && <Resultados prog={prog} a={a} total={total} comparacion={comparacion} />}
      {vista === 'plan' && <Plan prog={prog} a={a} setA={setA} avisar={avisar} />}

      {aviso && <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-marca px-4 py-2 text-sm text-white shadow-lg">{aviso}</div>}
    </div>
  )
}

function Kpi({ titulo, valor, color, extra }: { titulo: string; valor: string; color?: string; extra?: React.ReactNode }) {
  return (
    <div className="tarjeta rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{titulo}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>{valor}</div>
      {extra}
    </div>
  )
}

// ------------------------------------------------------------------ Evaluar

function Evaluar({ prog, a, soloLectura, actualizar, setA, avisar }: {
  prog: Programa; a: Auditoria; soloLectura: boolean
  actualizar: (item: string, c: Partial<Respuesta>) => void
  setA: React.Dispatch<React.SetStateAction<Auditoria>>; avisar: (t: string) => void
}) {
  // hojas evaluables: subsecciones (autocontrol) o puntos de contacto (estándares)
  const hojas = useMemo(() => nodosPlan(prog), [prog])
  const [sel, setSel] = useState(hojas[0]?.nodo.c ?? '')
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'nocumple'>('todos')
  const [buscar, setBuscar] = useState('')
  const actual = hojas.find((h) => h.nodo.c === sel) ?? hojas[0]
  const idx = hojas.indexOf(actual)

  const filtrar = (items: Item[]) => items.filter((it) => {
    const r = a.respuestas[it.c]
    if (filtro === 'pendientes' && (r?.na || (r?.o && (it.m || r.o.length)))) return false
    if (filtro === 'nocumple') { const p = puntajeItem(prog, it, r); if (p === null || p >= 0.5) return false }
    if (buscar && !`${it.c} ${it.t}`.toLowerCase().includes(buscar.toLowerCase())) return false
    return true
  })
  const buscando = buscar.trim().length > 1
  const items = buscando ? filtrar(prog.nodos.flatMap(itemsDe)) : filtrar(actual?.nodo.items ?? [])

  // agrupado por categoría (estándares) o lista simple (autocontrol)
  const grupos = new Map<string, Item[]>()
  for (const it of items) {
    const k = it.cat ?? ''
    grupos.set(k, [...(grupos.get(k) ?? []), it])
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <aside className="no-imprimir lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
        <select value={sel} onChange={(e) => setSel(e.target.value)} className={`${entrada} lg:hidden`}>
          {hojas.map(({ nodo, padre }) => <option key={nodo.c} value={nodo.c}>{padre ? `${padre.c} · ` : ''}{nodo.n}</option>)}
        </select>
        <nav className="hidden space-y-0.5 lg:block">
          {prog.nodos.map((n) => (
            <div key={n.c}>
              {n.hijos?.length ? (
                <>
                  <div className="mt-3 px-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{n.c} · {n.n}</div>
                  {n.hijos.map((h) => <EnlaceNodo key={h.c} n={h} prog={prog} a={a} activo={h.c === sel && !buscando} onClick={() => { setSel(h.c); setBuscar('') }} />)}
                </>
              ) : (
                <EnlaceNodo n={n} prog={prog} a={a} activo={n.c === sel && !buscando} onClick={() => { setSel(n.c); setBuscar('') }} />
              )}
            </div>
          ))}
        </nav>
      </aside>

      <section className="min-w-0 space-y-3">
        <div className="no-imprimir flex flex-wrap items-center gap-2">
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar en todo el programa…" className={`${entrada} max-w-xs rounded-full`} />
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm">
            <option value="todos">Todos los ítems</option>
            <option value="pendientes">Solo pendientes</option>
            <option value="nocumple">Solo los que no cumplen</option>
          </select>
        </div>

        {!buscando && actual && <CabeceraNodo prog={prog} a={a} nodo={actual.nodo} padre={actual.padre} />}
        {buscando && <p className="text-sm text-neutral-500">{items.length} resultados para “{buscar}”</p>}

        {[...grupos].map(([cat, lista]) => (
          <div key={cat} className="tarjeta overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            {cat && <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">{cat}</div>}
            <div className="divide-y divide-neutral-100">
              {lista.map((it) => (
                <FilaItem key={it.c} prog={prog} item={it} r={a.respuestas[it.c]} soloLectura={soloLectura}
                  onCambio={(c) => actualizar(it.c, c)} a={a} setA={setA} avisar={avisar} />
              ))}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500">No hay ítems con ese filtro.</p>}

        {!buscando && (
          <div className="no-imprimir flex justify-between gap-2 pt-1">
            <Boton disabled={idx <= 0} onClick={() => { setSel(hojas[idx - 1].nodo.c); window.scrollTo({ top: 0 }) }}>← Anterior</Boton>
            <Boton tipo="principal" disabled={idx >= hojas.length - 1} onClick={() => { setSel(hojas[idx + 1].nodo.c); window.scrollTo({ top: 0 }) }}>Siguiente →</Boton>
          </div>
        )}
      </section>
    </div>
  )
}

function EnlaceNodo({ n, prog, a, activo, onClick }: { n: Nodo; prog: Programa; a: Auditoria; activo: boolean; onClick: () => void }) {
  const r = resumirItems(prog, itemsDe(n), a.respuestas)
  const s = semaforo(r.cumplimiento)
  return (
    <button onClick={onClick} className={`w-full rounded-lg px-2 py-1.5 text-left ${activo ? 'bg-white shadow-[0_1px_4px_rgba(0,0,0,0.1)]' : 'hover:bg-white/60'}`}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className={`truncate ${activo ? 'font-semibold' : ''}`}>{n.icono ? `${n.icono} ` : ''}{n.n}</span>
        <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: s.color }}>{r.respondidos ? pct0(r.cumplimiento) : ''}</span>
      </div>
      <div className="mt-1"><Barra valor={r.cobertura} alto="h-1" color={r.cobertura >= 1 ? '#15803d' : '#a3a3a3'} /></div>
    </button>
  )
}

function CabeceraNodo({ prog, a, nodo, padre }: { prog: Programa; a: Auditoria; nodo: Nodo; padre?: Nodo }) {
  const [verNorma, setVerNorma] = useState(false)
  const r = resumirItems(prog, itemsDe(nodo), a.respuestas)
  const s = semaforo(r.cumplimiento)
  return (
    <div className="tarjeta rounded-xl border-l-4 border-acento bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {padre && <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{padre.c} · {padre.n}</div>}
          <h2 className="text-lg font-bold">{nodo.icono} {nodo.n}{nodo.en ? <span className="ml-2 text-sm font-normal text-neutral-400">{nodo.en}</span> : null}</h2>
          <div className="text-xs text-neutral-500">{r.respondidos} de {r.aplicables} evaluados{nodo.opcional ? ' · Opcional' : ''}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{pct1(r.cumplimiento)}</div>
          <Pildora {...s} />
        </div>
      </div>
      {nodo.norma?.objetivo && (
        <div className="mt-2 text-sm">
          <button onClick={() => setVerNorma(!verNorma)} className="text-acento underline">{verNorma ? 'Ocultar la norma' : 'Ver la norma de esta sección'}</button>
          {verNorma && <NormaTexto norma={nodo.norma} />}
        </div>
      )}
    </div>
  )
}

export function NormaTexto({ norma }: { norma: NonNullable<Nodo['norma']> }) {
  return (
    <div className="mt-2 space-y-2 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
      {norma.objetivo && <p><strong>Objetivo.</strong> {norma.objetivo}</p>}
      {norma.procedimiento && <p><strong>Procedimiento.</strong> {norma.procedimiento}</p>}
      {norma.focus?.length ? <div><strong>Focos de atención</strong><ul className="ml-5 list-disc">{norma.focus.map((f, i) => <li key={i}>{f}</li>)}</ul></div> : null}
      <p className="text-xs text-neutral-500">
        {[norma.responsable && `Responsable: ${norma.responsable}`, norma.supervision && `Supervisión: ${norma.supervision}`,
          norma.tipo_control && `Control: ${norma.tipo_control}`, norma.frecuencia && `Frecuencia: ${norma.frecuencia}`].filter(Boolean).join(' · ')}
      </p>
    </div>
  )
}

function colorOpcion(v: number) {
  if (v >= 100) return 'border-emerald-600 bg-emerald-600 text-white'
  if (v > 0) return 'border-amber-500 bg-amber-500 text-white'
  return 'border-acento bg-acento text-white'
}

function FilaItem({ prog, item, r, soloLectura, onCambio, a, setA, avisar }: {
  prog: Programa; item: Item; r?: Respuesta; soloLectura: boolean; onCambio: (c: Partial<Respuesta>) => void
  a: Auditoria; setA: React.Dispatch<React.SetStateAction<Auditoria>>; avisar: (t: string) => void
}) {
  const escala = prog.escalas[item.e ?? 0] ?? []
  const [abierto, setAbierto] = useState(false)
  const [obs, setObs] = useState(r?.obs ?? '')
  const archivo = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const elegidas = r?.o ?? []
  const p = puntajeItem(prog, item, r)

  const elegir = (i: number) => {
    if (soloLectura) return
    if (item.m) onCambio({ o: elegidas.includes(i) ? elegidas.filter((x) => x !== i) : [...elegidas, i].sort() })
    else onCambio({ o: [i] })
  }
  const subir = async (f: File) => {
    const fd = new FormData()
    fd.set('hotel', a.hotel); fd.set('auditoria', a.id); fd.set('item', item.c); fd.set('archivo', f)
    setSubiendo(true)
    try {
      await subirEvidencia(fd)
      location.reload() // trae la evidencia con su identificador definitivo
    } catch (e) { avisar((e as Error).message) } finally { setSubiendo(false) }
  }

  return (
    <div className={`px-4 py-3 ${r?.na ? 'opacity-60' : ''}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
            <span className="font-mono">{item.c}</span>
            <span>peso {item.p}</span>
            {item.m && <span>opción múltiple</span>}
            {p !== null && p < 0.5 && <span className="font-semibold text-acento">No cumple</span>}
          </div>
          <p className="text-sm leading-snug">{item.t}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1 md:max-w-[22rem] md:justify-end">
          {escala.map((op, i) => {
            const on = elegidas.includes(i) && !r?.na
            return (
              <button key={i} disabled={soloLectura} onClick={() => elegir(i)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${on ? colorOpcion(item.m ? 100 : op.v) : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'} disabled:cursor-default`}>
                {item.m && (on ? '☑ ' : '☐ ')}{op.t}
              </button>
            )
          })}
          {item.m && (
            <button disabled={soloLectura} onClick={() => onCambio({ o: [] })}
              className={`rounded-full border px-2.5 py-1 text-xs ${r?.o && r.o.length === 0 && !r.na ? 'border-acento bg-acento text-white' : 'border-neutral-300 bg-white text-neutral-700'}`}>
              Ninguna
            </button>
          )}
          <button disabled={soloLectura} onClick={() => onCambio({ na: !r?.na })}
            className={`rounded-full border px-2.5 py-1 text-xs ${r?.na ? 'border-neutral-700 bg-neutral-700 text-white' : 'border-dashed border-neutral-300 bg-white text-neutral-500'}`}>
            N/A
          </button>
          <button onClick={() => setAbierto(!abierto)} title="Observación y evidencia"
            className={`ml-1 rounded-full px-2 py-1 text-xs ${r?.obs || r?.ev?.length ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}>
            {r?.ev?.length ? `📎 ${r.ev.length}` : '📎'}{r?.obs ? ' 💬' : ''}
          </button>
        </div>
      </div>
      {abierto && (
        <div className="mt-2 grid gap-2 rounded-lg bg-neutral-50 p-3 md:grid-cols-2">
          <label className="text-xs text-neutral-600">Observación
            <textarea value={obs} disabled={soloLectura} onChange={(e) => setObs(e.target.value)} rows={2}
              onBlur={() => obs !== (r?.obs ?? '') && onCambio({ obs })} className={`${entrada} mt-1`} placeholder="Hallazgo, contexto, quién lo verificó…" />
          </label>
          <div className="text-xs text-neutral-600">
            Evidencia
            <ul className="mt-1 space-y-1">
              {(r?.ev ?? []).map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1">
                  <a href={`/calidad/evidencia/${a.hotel}/${a.id}/${ev.id}`} target="_blank" rel="noreferrer" className="truncate text-marca underline">{ev.nombre}</a>
                  {!soloLectura && <button className="text-acento" onClick={async () => {
                    await quitarEvidencia(a.hotel, a.id, item.c, ev.id)
                    setA((x) => ({ ...x, respuestas: { ...x.respuestas, [item.c]: { ...x.respuestas[item.c], ev: x.respuestas[item.c]?.ev?.filter((e) => e.id !== ev.id) } } }))
                  }}>Quitar</button>}
                </li>
              ))}
            </ul>
            {!soloLectura && (
              <>
                <input ref={archivo} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])} />
                <button onClick={() => archivo.current?.click()} disabled={subiendo} className="mt-1 rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs">
                  {subiendo ? 'Subiendo…' : '+ Adjuntar archivo'}
                </button>
              </>
            )}
            {r?.por && <div className="mt-2 text-[11px] text-neutral-400">Última respuesta: {r.por}{r.fecha ? ` · ${fechaCortaAR(r.fecha)}` : ''}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ Resultados

function Resultados({ prog, a, total, comparacion }: {
  prog: Programa; a: Auditoria; total: Resumen
  comparacion: Props['comparacion']
}) {
  const areas = prog.nodos.map((n) => ({ n, r: resumirItems(prog, itemsDe(n), a.respuestas) }))
    .sort((x, y) => (y.r.cumplimiento ?? -1) - (x.r.cumplimiento ?? -1))
  const cats = prog.id === 'estandares' ? porCategoria(prog, a.respuestas).filter((c) => c.respondidos).sort((x, y) => (x.cumplimiento ?? 0) - (y.cumplimiento ?? 0)) : []
  const delta = comparacion && total.cumplimiento !== null && comparacion.global !== null ? total.cumplimiento - comparacion.global : null
  const titulo = prog.id === 'estandares' ? 'Por punto de contacto' : 'Por área'

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <div className="tarjeta flex flex-col items-center rounded-xl bg-white p-5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-semibold">Cumplimiento global</div>
          <Medidor valor={(total.cumplimiento ?? 0) * 100} color={semaforo(total.cumplimiento).color} />
          <Pildora {...semaforo(total.cumplimiento)} />
          <p className="mt-3 text-xs text-neutral-500">Sobre {total.respondidos} ítems evaluados ({pct0(total.cobertura)} del programa). Objetivo: {pct0(OBJETIVO)}.</p>
          {comparacion && (
            <p className="mt-2 text-xs">
              vs <span className="text-neutral-500">{comparacion.titulo}</span>:{' '}
              {delta === null ? '—' : <strong className={delta >= 0 ? 'text-emerald-700' : 'text-acento'}>{delta >= 0 ? '+' : ''}{(delta * 100).toFixed(1)} pts</strong>}
            </p>
          )}
        </div>
        <div className="tarjeta rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">{titulo}</h3>
            <span className="text-xs text-neutral-500">— objetivo {pct0(OBJETIVO)}</span>
          </div>
          <div className="space-y-2">
            {areas.map(({ n, r }) => {
              const s = semaforo(r.cumplimiento)
              const ant = comparacion?.porNodo[n.c]
              const d = ant != null && r.cumplimiento !== null ? r.cumplimiento - ant : null
              return (
                <div key={n.c} className="grid grid-cols-[minmax(0,11rem)_1fr_4.5rem] items-center gap-3 text-sm sm:grid-cols-[minmax(0,15rem)_1fr_7rem]">
                  <span className="truncate" title={n.n}>{n.icono ? `${n.icono} ` : ''}{n.n}</span>
                  <div className="relative h-4 rounded bg-neutral-100">
                    <div className="h-4 rounded" style={{ width: `${(r.cumplimiento ?? 0) * 100}%`, background: s.color, opacity: r.respondidos ? 1 : 0 }} />
                    <div className="absolute inset-y-0 border-l-2 border-dashed border-emerald-700" style={{ left: `${OBJETIVO * 100}%` }} />
                  </div>
                  <span className="text-right tabular-nums">
                    <strong style={{ color: s.color }}>{r.respondidos ? pct0(r.cumplimiento) : '—'}</strong>
                    {d !== null && <span className={`ml-1 hidden text-xs sm:inline ${d >= 0 ? 'text-emerald-700' : 'text-acento'}`}>{d >= 0 ? '▲' : '▼'}{Math.abs(d * 100).toFixed(0)}</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {prog.nodos.some((n) => n.hijos?.length) && (
        <div className="tarjeta overflow-x-auto rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <h3 className="mb-3 font-bold">Detalle por sección</h3>
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="border-b-2 border-marca text-left text-[11px] uppercase tracking-wide text-neutral-500">
              <tr><th className="py-2">Sección</th><th className="text-right">Peso</th><th className="text-right">Evaluado</th><th className="text-right">Cumplimiento</th><th className="pl-3">Estado</th><th>Prioridad</th></tr>
            </thead>
            <tbody>
              {prog.nodos.map((n) => [n, ...(n.hijos ?? [])].map((x, i) => {
                const r = resumirItems(prog, itemsDe(x), a.respuestas)
                const s = semaforo(r.cumplimiento)
                const pr = i > 0 ? prioridad(r.cumplimiento) : null
                return (
                  <tr key={x.c} className={`border-b border-neutral-100 ${i === 0 ? 'bg-neutral-50 font-semibold' : ''}`}>
                    <td className={`py-1.5 ${i > 0 ? 'pl-4' : ''}`}>{x.c} · {x.n}</td>
                    <td className="text-right tabular-nums">{i === 0 ? n.peso ?? '' : ''}</td>
                    <td className="text-right tabular-nums">{pct0(r.cobertura)}</td>
                    <td className="text-right font-semibold tabular-nums" style={{ color: s.color }}>{pct1(r.cumplimiento)}</td>
                    <td className="pl-3"><Pildora {...s} /></td>
                    <td>{pr && <span className={`text-xs font-semibold ${pr === 'Alta' ? 'text-acento' : pr === 'Media' ? 'text-amber-700' : 'text-neutral-600'}`}>{pr}</span>}</td>
                  </tr>
                )
              }))}
            </tbody>
          </table>
        </div>
      )}

      {cats.length > 0 && (
        <div className="tarjeta rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <h3 className="mb-1 font-bold">Por categoría</h3>
          <p className="mb-3 text-xs text-neutral-500">Temas transversales a todos los puntos de contacto, de menor a mayor cumplimiento.</p>
          <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
            {cats.map((c) => {
              const s = semaforo(c.cumplimiento)
              return (
                <div key={c.cat} className="grid grid-cols-[1fr_6rem_3rem] items-center gap-2 text-sm">
                  <span className="truncate">{c.cat}</span>
                  <Barra valor={c.cumplimiento ?? 0} color={s.color} alto="h-2" />
                  <span className="text-right font-semibold tabular-nums" style={{ color: s.color }}>{pct0(c.cumplimiento)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ Plan de acción

function Plan({ prog, a, setA, avisar }: {
  prog: Programa; a: Auditoria; setA: React.Dispatch<React.SetStateAction<Auditoria>>; avisar: (t: string) => void
}) {
  const [todas, setTodas] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const filas = nodosPlan(prog).map(({ nodo, padre }) => {
    const r = resumirItems(prog, itemsDe(nodo), a.respuestas)
    const fallas = (nodo.items ?? []).filter((it) => { const p = puntajeItem(prog, it, a.respuestas[it.c]); return p !== null && p < 1 })
    return { nodo, padre, r, pr: prioridad(r.cumplimiento), accion: a.plan[nodo.c], fallas }
  }).filter((f) => todas || f.pr || f.accion)
    .sort((x, y) => (x.r.cumplimiento ?? 2) - (y.r.cumplimiento ?? 2))

  const guardar = async (nodo: string, acc: Accion) => {
    setA((x) => ({ ...x, plan: { ...x.plan, [nodo]: acc } }))
    try { await guardarAccion(a.hotel, a.id, nodo, acc); avisar('Plan actualizado') } catch (e) { avisar((e as Error).message) }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">Se proponen acciones para cada sección por debajo del objetivo ({pct0(OBJETIVO)}), de la más crítica a la menos.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} className="accent-[#b5121b]" /> Ver también las que cumplen</label>
      </div>
      {filas.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500">Todas las secciones evaluadas alcanzan el objetivo. 👏</p>}
      {filas.map(({ nodo, padre, r, pr, accion, fallas }) => {
        const s = semaforo(r.cumplimiento)
        const est = ESTADOS_ACCION.find((e) => e.valor === (accion?.estado ?? 'pendiente'))!
        const vencida = accion?.vence && accion.estado !== 'hecha' && accion.vence < new Date().toISOString().slice(0, 10)
        return (
          <div key={nodo.c} className="tarjeta rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {pr && <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${pr === 'Alta' ? 'bg-acento text-white' : pr === 'Media' ? 'bg-amber-500 text-white' : 'bg-neutral-200 text-neutral-700'}`}>Prioridad {pr.toLowerCase()}</span>}
                  <span className="text-xs text-neutral-500">{padre ? `${padre.n} › ` : ''}</span>
                  <span className="font-semibold">{nodo.icono} {nodo.n}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: s.color }}>{pct0(r.cumplimiento)}</span>
                </div>
                <p className="mt-1 text-sm text-neutral-700">
                  {nodo.accion || (fallas.length ? `Corregir ${fallas.length} estándar${fallas.length > 1 ? 'es' : ''} sin cumplir: ${fallas.slice(0, 3).map((f) => f.c).join(', ')}${fallas.length > 3 ? '…' : ''}.` : 'Revisar la sección.')}
                </p>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">{est.texto}</div>
                <div className="text-xs text-neutral-500">{accion?.responsable || 'Sin responsable'}</div>
                {accion?.vence && <div className={`text-xs ${vencida ? 'font-semibold text-acento' : 'text-neutral-500'}`}>{vencida ? 'Vencida · ' : 'Vence '}{fechaCortaAR(accion.vence)}</div>}
                <button onClick={() => setEditando(nodo.c)} className="mt-1 text-xs text-acento underline">{accion ? 'Editar' : 'Asignar'}</button>
              </div>
            </div>
            {accion?.nota && <p className="mt-2 rounded bg-neutral-50 px-2 py-1 text-xs text-neutral-600">{accion.nota}</p>}
          </div>
        )
      })}
      {editando && (
        <EditarAccion nodo={nodosPlan(prog).find((x) => x.nodo.c === editando)!.nodo} accion={a.plan[editando]}
          onCerrar={() => setEditando(null)} onGuardar={(acc) => { guardar(editando, acc); setEditando(null) }} />
      )}
    </div>
  )
}

function EditarAccion({ nodo, accion, onCerrar, onGuardar }: { nodo: Nodo; accion?: Accion; onCerrar: () => void; onGuardar: (a: Accion) => void }) {
  const [x, setX] = useState<Accion>(accion ?? { estado: 'pendiente' })
  return (
    <Modal titulo={`Acción · ${nodo.n}`} onCerrar={onCerrar}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-neutral-600">Responsable
          <input className={entrada} value={x.responsable ?? ''} onChange={(e) => setX({ ...x, responsable: e.target.value })} placeholder="Nombre y área" />
        </label>
        <label className="text-xs text-neutral-600">Fecha límite
          <input type="date" className={entrada} value={x.vence ?? ''} onChange={(e) => setX({ ...x, vence: e.target.value })} />
        </label>
        <label className="text-xs text-neutral-600 sm:col-span-2">Estado
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ESTADOS_ACCION.map((e) => (
              <button key={e.valor} type="button" onClick={() => setX({ ...x, estado: e.valor })}
                className={`rounded-full border px-3 py-1 text-sm ${x.estado === e.valor ? 'border-marca bg-marca text-white' : 'border-neutral-300 bg-white'}`}>{e.texto}</button>
            ))}
          </div>
        </label>
        <label className="text-xs text-neutral-600 sm:col-span-2">Nota
          <textarea className={entrada} rows={3} value={x.nota ?? ''} onChange={(e) => setX({ ...x, nota: e.target.value })} placeholder="Qué se va a hacer, avances, evidencia de cierre…" />
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Boton onClick={onCerrar}>Cancelar</Boton>
        <Boton tipo="principal" onClick={() => onGuardar(x)}>Guardar</Boton>
      </div>
    </Modal>
  )
}
