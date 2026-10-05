'use client'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { borrarGestion, fijarPrevista, guardarCliente, nuevaGestion, quitarAdjunto, subirAdjunto } from '@/app/cobranzas/acciones'
import { TRAMOS, antiguedad, comprobante, destino, diasVencida, semanas } from '@/lib/gestion/cobranzas/calculo'
import { TIPOS_GESTION, type Cliente, type TipoGestion } from '@/lib/gestion/cobranzas/modelo'
import { urlFactura } from '@/lib/gestion/cobranzas/pdf'
import { Boton, Modal, Pestanas, entrada, fechaCortaAR } from '../comunes'
import type { Datos } from './Cobranzas'
import { COLOR_TRAMO, pesos, pesos2 } from './formato'

type Vista = 'facturas' | 'gestiones' | 'datos' | 'adjuntos'

export default function Ficha({ hotel, base, clientes, gestiones, previstas, listas, usuario, codigo, vistaInicial, onCerrar }: Datos & {
  codigo: string; vistaInicial?: 'facturas' | 'gestiones' | 'datos'; onCerrar: () => void
}) {
  const router = useRouter()
  const [vista, setVista] = useState<Vista>(vistaInicial ?? 'facturas')
  const [aviso, setAviso] = useState('')
  const [pendiente, iniciar] = useTransition()
  const c: Cliente = clientes[codigo] ?? { codigo, nombre: codigo }
  const facturas = useMemo(() => base.facturas.filter((f) => f.cliente === codigo).sort((x, y) => x.vence.localeCompare(y.vence)), [base, codigo])
  const a = antiguedad(facturas, base.corte)
  const lista = gestiones[codigo] ?? []
  const ejecutar = (fn: () => Promise<unknown>, ok?: string) => iniciar(async () => {
    try { await fn(); router.refresh(); if (ok) { setAviso(ok); setTimeout(() => setAviso(''), 2500) } } catch (e) { setAviso((e as Error).message) }
  })

  return (
    <Modal titulo={c.nombre} onCerrar={onCerrar} ancho="max-w-5xl">
      <div className="-mt-3 mb-4 text-xs text-neutral-500">
        Código {codigo}{c.cuit ? ` · CUIT ${c.cuit}` : ''}{c.grupo ? ' · Grupo' : ''}{c.respCobranza ? ` · Cobranza: ${c.respCobranza}` : ''}{c.estado ? ` · ${c.estado}` : ''}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini t="Saldo" v={pesos(a.total)} />
        <Mini t="Vencido" v={pesos(a.vencido)} color={a.vencido > 0 ? '#b5121b' : undefined} />
        <Mini t="Mayor atraso" v={a.maxAtraso > 0 ? `${a.maxAtraso} días` : '—'} />
        <Mini t="Comprobantes" v={String(a.facturas)} />
      </div>
      <div className="my-3 flex h-2 overflow-hidden rounded">
        {TRAMOS.map((t) => a[t.k] > 0 && <div key={t.k} title={t.t} style={{ flex: a[t.k], background: COLOR_TRAMO[t.k] }} />)}
      </div>
      <Pestanas valor={vista} onChange={setVista} opciones={[
        { valor: 'facturas', texto: 'Facturas' },
        { valor: 'gestiones', texto: 'Gestiones', extra: lista.length ? <span className="text-xs text-neutral-400">{lista.length}</span> : null },
        { valor: 'datos', texto: 'Datos' },
        { valor: 'adjuntos', texto: 'Adjuntos', extra: c.adjuntos?.length ? <span className="text-xs text-neutral-400">{c.adjuntos.length}</span> : null },
      ]} />
      <div className="mt-4">
        {vista === 'facturas' && <Facturas hotel={hotel.id} corte={base.corte} facturas={facturas} previstas={previstas} codigo={codigo} ejecutar={ejecutar} pendiente={pendiente} />}
        {vista === 'gestiones' && <Gestiones hotel={hotel.id} codigo={codigo} lista={lista} plantillas={listas.plantillas} usuario={usuario} ejecutar={ejecutar} pendiente={pendiente} />}
        {vista === 'datos' && <DatosCliente hotel={hotel.id} c={c} listas={listas} ejecutar={ejecutar} pendiente={pendiente} />}
        {vista === 'adjuntos' && <Adjuntos hotel={hotel.id} c={c} ejecutar={ejecutar} pendiente={pendiente} />}
      </div>
      {aviso && <p className="mt-3 rounded bg-neutral-100 px-3 py-2 text-sm">{aviso}</p>}
    </Modal>
  )
}

function Mini({ t, v, color }: { t: string; v: string; color?: string }) {
  return <div className="rounded-lg bg-neutral-50 px-3 py-2"><div className="text-[11px] text-neutral-500">{t}</div><div className="font-bold tabular-nums" style={{ color }}>{v}</div></div>
}

type Ejecutar = (fn: () => Promise<unknown>, ok?: string) => void

function Facturas({ hotel, corte, facturas, previstas, codigo, ejecutar, pendiente }: {
  hotel: string; corte: string; facturas: Datos['base']['facturas']; previstas: Record<string, string>; codigo: string; ejecutar: Ejecutar; pendiente: boolean
}) {
  const [marcadas, setMarcadas] = useState<string[]>([])
  const [fecha, setFecha] = useState(semanas(corte)[0].hasta)
  const todas = marcadas.length === facturas.length
  const etiqueta = (id: string, d: ReturnType<typeof destino>) =>
    d === 'sinFecha' ? <span className="font-semibold text-acento">Sin fecha</span>
      : d === 'atrasada' ? <span className="font-semibold text-acento">Promesa vencida</span>
      : d === 'despues' ? <span className="text-neutral-500">Más adelante</span>
      : <span className="text-emerald-700">Semana {d + 1}{previstas[id] ? '' : ' (vto.)'}</span>
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span>{marcadas.length ? `${marcadas.length} seleccionadas:` : 'Seleccioná facturas para fijar la fecha prevista de cobro'}</span>
          {marcadas.length > 0 && <>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-full border border-neutral-300 bg-white px-2 py-0.5" />
            <Boton tipo="principal" disabled={pendiente} onClick={() => ejecutar(() => fijarPrevista(hotel, marcadas, fecha).then(() => setMarcadas([])), 'Fecha prevista guardada')}>Fijar fecha</Boton>
            <Boton disabled={pendiente} onClick={() => ejecutar(() => fijarPrevista(hotel, marcadas, null).then(() => setMarcadas([])), 'Fecha quitada')}>Quitar fecha</Boton>
          </>}
        </div>
        <div className="flex gap-2">
          <a href={`/cobranzas/descargar?hotel=${hotel}&tipo=estado&cliente=${codigo}`} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm">Estado de cuenta (Excel)</a>
          <a href={`/cobranzas/estado?hotel=${hotel}&cliente=${codigo}`} target="_blank" rel="noreferrer" className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm">Imprimir</a>
        </div>
      </div>
      <div className="max-h-[45vh] overflow-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="sticky top-0 bg-white text-left text-[11px] uppercase tracking-wide text-neutral-500 shadow-[0_1px_0_#e5e5e5]">
            <tr>
              <th className="px-2 py-2"><input type="checkbox" checked={todas && facturas.length > 0} onChange={() => setMarcadas(todas ? [] : facturas.map((f) => f.id))} className="accent-[#b5121b]" /></th>
              <th>Comprobante</th><th>Emisión</th><th>Vencimiento</th><th className="text-right">Atraso</th><th className="text-right">Saldo</th><th className="pl-4">Cobro previsto</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => {
              const d = diasVencida(f, corte), url = urlFactura(hotel, f), dest = destino(f, corte, previstas[f.id])
              return (
                <tr key={f.id} className="border-t border-neutral-100">
                  <td className="px-2 py-1.5"><input type="checkbox" checked={marcadas.includes(f.id)} className="accent-[#b5121b]"
                    onChange={() => setMarcadas((m) => (m.includes(f.id) ? m.filter((x) => x !== f.id) : [...m, f.id]))} /></td>
                  <td className="font-mono text-xs">{url ? <a href={url} target="_blank" rel="noreferrer" className="text-marca underline">{comprobante(f)}</a> : comprobante(f)}</td>
                  <td>{fechaCortaAR(f.emision)}</td>
                  <td>{fechaCortaAR(f.vence)}</td>
                  <td className={`text-right tabular-nums ${d > 90 ? 'font-semibold text-acento' : d > 0 ? 'text-amber-700' : 'text-neutral-400'}`}>{d > 0 ? `${d} d` : 'al día'}</td>
                  <td className={`text-right tabular-nums ${f.saldo < 0 ? 'text-emerald-700' : ''}`}>{pesos2(f.saldo)}</td>
                  <td className="pl-4 text-xs">{previstas[f.id] ? `${fechaCortaAR(previstas[f.id])} · ` : ''}{etiqueta(f.id, dest)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Gestiones({ hotel, codigo, lista, plantillas, usuario, ejecutar, pendiente }: {
  hotel: string; codigo: string; lista: Datos['gestiones'][string]; plantillas: string[]; usuario: Datos['usuario']; ejecutar: Ejecutar; pendiente: boolean
}) {
  const [tipo, setTipo] = useState<TipoGestion>('llamada')
  const [texto, setTexto] = useState('')
  const [promesaFecha, setPromesaFecha] = useState('')
  const [promesaMonto, setPromesaMonto] = useState('')
  const [aplicar, setAplicar] = useState(true)
  const guardar = () => ejecutar(async () => {
    await nuevaGestion(hotel, codigo, { tipo, texto, promesaFecha: tipo === 'promesa' ? promesaFecha : undefined, promesaMonto: tipo === 'promesa' && promesaMonto ? Number(promesaMonto) : undefined, aplicarPromesa: aplicar })
    setTexto(''); setPromesaFecha(''); setPromesaMonto('')
  }, 'Gestión registrada')
  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_GESTION.map((t) => (
            <button key={t.valor} onClick={() => setTipo(t.valor)} className={`rounded-full border px-3 py-1 text-sm ${tipo === t.valor ? 'border-marca bg-marca text-white' : 'border-neutral-300 bg-white'}`}>{t.icono} {t.texto}</button>
          ))}
        </div>
        <select value="" onChange={(e) => e.target.value && setTexto(e.target.value)} className={entrada}>
          <option value="">Usar un texto modelo…</option>
          {plantillas.map((p) => <option key={p}>{p}</option>)}
        </select>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} className={entrada} placeholder="Qué se hizo, con quién se habló, qué se acordó…" />
        {tipo === 'promesa' && (
          <div className="grid gap-2 rounded-lg bg-emerald-50 p-3 sm:grid-cols-2">
            <label className="text-xs text-neutral-600">Fecha prometida<input type="date" value={promesaFecha} onChange={(e) => setPromesaFecha(e.target.value)} className={entrada} /></label>
            <label className="text-xs text-neutral-600">Monto (opcional)<input type="number" value={promesaMonto} onChange={(e) => setPromesaMonto(e.target.value)} className={entrada} /></label>
            <label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={aplicar} onChange={(e) => setAplicar(e.target.checked)} className="accent-[#b5121b]" />
              Usar esta fecha como cobro previsto de las facturas vencidas sin fecha</label>
          </div>
        )}
        <Boton tipo="principal" disabled={pendiente || !texto.trim() || (tipo === 'promesa' && !promesaFecha)} onClick={guardar}>Registrar gestión</Boton>
      </div>
      <ol className="relative space-y-3 border-l-2 border-neutral-200 pl-4">
        {lista.length === 0 && <li className="text-sm text-neutral-500">Todavía no hay gestiones registradas para este cliente.</li>}
        {lista.map((g) => {
          const t = TIPOS_GESTION.find((x) => x.valor === g.tipo)
          return (
            <li key={g.id} className="relative">
              <span className="absolute -left-[1.4rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs">{t?.icono}</span>
              <div className="text-xs text-neutral-500">{new Date(g.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} · {g.por} · {t?.texto}</div>
              <p className="text-sm">{g.texto}</p>
              {g.promesaFecha && <p className="text-xs font-semibold text-emerald-700">Promete pagar el {fechaCortaAR(g.promesaFecha)}{g.promesaMonto ? ` · ${pesos(g.promesaMonto)}` : ''}</p>}
              {(g.por === usuario.nombre || usuario.rol === 'admin') && (
                <button onClick={() => confirm('¿Borrar esta gestión?') && ejecutar(() => borrarGestion(hotel, codigo, g.id))} className="text-[11px] text-neutral-400 underline hover:text-acento">Borrar</button>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function DatosCliente({ hotel, c, listas, ejecutar, pendiente }: { hotel: string; c: Cliente; listas: Datos['listas']; ejecutar: Ejecutar; pendiente: boolean }) {
  const [x, setX] = useState<Cliente>(c)
  const campo = (k: keyof Cliente, t: string, tipo = 'text') => (
    <label className="text-xs text-neutral-600">{t}
      <input type={tipo} value={(x[k] as string) ?? ''} onChange={(e) => setX({ ...x, [k]: e.target.value })} className={entrada} />
    </label>
  )
  const lista = (k: keyof Cliente, t: string, opciones: string[]) => (
    <label className="text-xs text-neutral-600">{t}
      <select value={(x[k] as string) ?? ''} onChange={(e) => setX({ ...x, [k]: e.target.value })} className={entrada}>
        <option value="">—</option>
        {[...new Set([...opciones, ...((x[k] as string) ? [x[k] as string] : [])])].map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  )
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {lista('respCobranza', 'Responsable de cobranza', listas.respCobranza)}
        {lista('respVentas', 'Responsable comercial', listas.respVentas)}
        {lista('estado', 'Estado de gestión', listas.estado)}
        {lista('condicion', 'Condición', listas.condicion)}
        {lista('deudaPor', 'Deuda por', listas.deudaPor)}
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={!!x.grupo} onChange={(e) => setX({ ...x, grupo: e.target.checked })} className="accent-[#b5121b]" /> Es del grupo (management / intercompany)</label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {campo('contacto', 'Contacto')}{campo('email', 'Email', 'email')}{campo('telefono', 'Teléfono')}
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        {campo('eventoNombre', 'Evento')}{campo('eventoFecha', 'Fecha del evento', 'date')}{campo('blockCode', 'Block code')}{campo('pm', 'PM')}{campo('invoice', 'Invoice Nº')}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-neutral-400">{c.actualizadoPor ? `Última modificación: ${c.actualizadoPor} · ${fechaCortaAR(c.actualizado ?? '')}` : ''}</span>
        <Boton tipo="principal" disabled={pendiente} onClick={() => ejecutar(() => guardarCliente(hotel, c.codigo, x), 'Datos guardados')}>Guardar datos</Boton>
      </div>
    </div>
  )
}

function Adjuntos({ hotel, c, ejecutar, pendiente }: { hotel: string; c: Cliente; ejecutar: Ejecutar; pendiente: boolean }) {
  const archivo = useRef<HTMLInputElement>(null)
  const subir = (f: File) => {
    const fd = new FormData()
    fd.set('hotel', hotel); fd.set('cliente', c.codigo); fd.set('archivo', f)
    ejecutar(() => subirAdjunto(fd), 'Archivo adjuntado')
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">Mails, acuerdos, reclamos firmados: quedan guardados en el servidor, no dentro de ningún archivo que circule.</p>
      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {(c.adjuntos ?? []).length === 0 && <li className="px-3 py-3 text-sm text-neutral-500">Sin adjuntos.</li>}
        {(c.adjuntos ?? []).map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <a href={`/cobranzas/adjunto/${hotel}/${c.codigo}/${a.id}`} target="_blank" rel="noreferrer" className="truncate text-marca underline">{a.nombre}</a>
            <span className="flex shrink-0 items-center gap-3 text-xs text-neutral-500">{a.por} · {fechaCortaAR(a.fecha)}
              <button className="text-acento" onClick={() => confirm('¿Quitar el adjunto?') && ejecutar(() => quitarAdjunto(hotel, c.codigo, a.id))}>Quitar</button></span>
          </li>
        ))}
      </ul>
      <input ref={archivo} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])} />
      <Boton disabled={pendiente} onClick={() => archivo.current?.click()}>+ Adjuntar archivo</Boton>
    </div>
  )
}
