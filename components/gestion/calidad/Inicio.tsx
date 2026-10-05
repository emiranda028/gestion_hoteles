'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { nuevaAuditoria } from '@/app/calidad/acciones'
import { semaforo } from '@/lib/gestion/calidad/calculo'
import { OBJETIVO } from '@/lib/gestion/calidad/modelo'
import { Barra, Boton, Encabezado, Modal, Pildora, SelectorHotel, entrada, fechaCortaAR, pct0, pct1 } from '../comunes'

type Fila = {
  id: string; programa: string; titulo: string; periodo: string; fecha: string; auditor: string
  estado: 'borrador' | 'cerrada'; ejemplo: boolean; cumplimiento: number | null; cobertura: number; noCumple: number; acciones: number
}
type Prog = { id: string; nombre: string; descripcion: string; items: number; areas: number }

export default function CalidadInicio({ hotel, hoteles, programas, auditorias, usuario }: {
  hotel: string; hoteles: { id: string; nombre: string }[]; programas: Prog[]; auditorias: Fila[]; usuario: { nombre: string; admin: boolean }
}) {
  const [nueva, setNueva] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<string>('todos')
  const visibles = auditorias.filter((a) => filtro === 'todos' || a.programa === filtro)

  return (
    <div className="space-y-6">
      <Encabezado titulo="Calidad"
        bajada="Estándares de servicio y autocontrol interno con una misma lógica: se evalúa, se calcula el cumplimiento, se arma el plan de acción y se sigue la evolución.">
        <SelectorHotel hoteles={hoteles} actual={hotel} base="/calidad" />
      </Encabezado>

      <div className="grid gap-4 lg:grid-cols-2">
        {programas.map((p) => {
          const cerradas = auditorias.filter((a) => a.programa === p.id && a.estado === 'cerrada').sort((a, b) => a.fecha.localeCompare(b.fecha))
          const ultima = cerradas[cerradas.length - 1]
          const anterior = cerradas[cerradas.length - 2]
          const s = semaforo(ultima?.cumplimiento ?? null)
          const delta = ultima?.cumplimiento != null && anterior?.cumplimiento != null ? ultima.cumplimiento - anterior.cumplimiento : null
          return (
            <section key={p.id} className="tarjeta flex flex-col rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{p.nombre}</h2>
                  <p className="mt-0.5 text-sm text-neutral-500">{p.descripcion}</p>
                  <p className="mt-1 text-xs text-neutral-400">{p.areas} {p.id === 'estandares' ? 'puntos de contacto' : 'áreas'} · {p.items.toLocaleString('es-AR')} {p.id === 'estandares' ? 'estándares' : 'preguntas'}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{pct0(ultima?.cumplimiento ?? null)}</div>
                  <Pildora {...s} />
                  {delta !== null && (
                    <div className={`mt-1 text-xs font-semibold ${delta >= 0 ? 'text-emerald-700' : 'text-acento'}`}>
                      {delta >= 0 ? '▲' : '▼'} {Math.abs(delta * 100).toFixed(1)} pts vs anterior
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 h-28">
                {cerradas.length > 1 ? (
                  <ResponsiveContainer>
                    <LineChart data={cerradas.map((a) => ({ x: a.periodo || fechaCortaAR(a.fecha), y: (a.cumplimiento ?? 0) * 100 }))} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid stroke="#ececec" vertical={false} />
                      <XAxis dataKey="x" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <ReferenceLine y={OBJETIVO * 100} stroke="#15803d" strokeDasharray="4 4" />
                      <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                      <Line dataKey="y" stroke="#b5121b" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-neutral-50 text-center text-xs text-neutral-500">
                    {ultima ? 'La evolución aparece a partir de la segunda auditoría cerrada.' : 'Todavía no hay auditorías cerradas de este programa.'}
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Boton tipo="principal" onClick={() => setNueva(p.id)}>+ Nueva auditoría</Boton>
                <Link href={`/calidad/manual/${p.id}`} className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium hover:border-neutral-500">
                  Manual
                </Link>
              </div>
            </section>
          )
        })}
      </div>

      <section className="tarjeta rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">Auditorías</h2>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm">
            <option value="todos">Todos los programas</option>
            {programas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        {visibles.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">Todavía no hay auditorías. Empezá con “Nueva auditoría”.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {visibles.map((a) => {
              const s = semaforo(a.cumplimiento)
              return (
                <Link key={a.id} href={`/calidad/${hotel}/${a.id}`} className="grid items-center gap-x-4 gap-y-1 py-3 hover:bg-neutral-50 sm:grid-cols-[1fr_7rem_9rem_7rem] sm:px-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{a.titulo}</span>
                      {a.estado === 'borrador' ? <Pildora texto="En curso" color="#1d4ed8" fondo="#dbeafe" /> : <Pildora texto="Cerrada" color="#404040" fondo="#e5e5e5" />}
                      {a.ejemplo && <Pildora texto="Ejemplo" color="#7c3aed" fondo="#ede9fe" />}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {programas.find((p) => p.id === a.programa)?.nombre} · {a.periodo || '—'} · {fechaCortaAR(a.fecha)} · {a.auditor}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-500">Evaluado {pct0(a.cobertura)}</div>
                    <Barra valor={a.cobertura} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{pct1(a.cumplimiento)}</span>
                    <Pildora {...s} />
                  </div>
                  <div className="text-xs text-neutral-500">
                    {a.noCumple > 0 && <div className="text-acento">{a.noCumple} no cumplen</div>}
                    {a.acciones > 0 && <div>{a.acciones} acciones abiertas</div>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {nueva && (
        <NuevaAuditoria hotel={hotel} programa={programas.find((p) => p.id === nueva)!} auditor={usuario.nombre}
          puedeEjemplo={usuario.admin} onCerrar={() => setNueva(null)} />
      )}
    </div>
  )
}

function NuevaAuditoria({ hotel, programa, auditor, puedeEjemplo, onCerrar }: {
  hotel: string; programa: Prog; auditor: string; puedeEjemplo: boolean; onCerrar: () => void
}) {
  const router = useRouter()
  const hoy = new Date().toISOString().slice(0, 10)
  const trimestre = `${Math.floor(new Date().getMonth() / 3) + 1}º trimestre ${new Date().getFullYear()}`
  const [datos, setDatos] = useState({ titulo: `${programa.nombre} · ${trimestre}`, periodo: trimestre, fecha: hoy, auditor, ejemplo: false })
  const [error, setError] = useState('')
  const [pendiente, iniciar] = useTransition()
  const crear = () => iniciar(async () => {
    try {
      const id = await nuevaAuditoria({ hotel, programa: programa.id, ...datos })
      router.push(`/calidad/${hotel}/${id}`)
    } catch (e) { setError((e as Error).message) }
  })
  return (
    <Modal titulo={`Nueva auditoría · ${programa.nombre}`} onCerrar={onCerrar}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-neutral-600 sm:col-span-2">Título
          <input className={entrada} value={datos.titulo} onChange={(e) => setDatos({ ...datos, titulo: e.target.value })} />
        </label>
        <label className="text-xs text-neutral-600">Período
          <input className={entrada} value={datos.periodo} onChange={(e) => setDatos({ ...datos, periodo: e.target.value })} />
        </label>
        <label className="text-xs text-neutral-600">Fecha
          <input type="date" className={entrada} value={datos.fecha} onChange={(e) => setDatos({ ...datos, fecha: e.target.value })} />
        </label>
        <label className="text-xs text-neutral-600 sm:col-span-2">Auditor
          <input className={entrada} value={datos.auditor} onChange={(e) => setDatos({ ...datos, auditor: e.target.value })} />
        </label>
        {puedeEjemplo && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={datos.ejemplo} onChange={(e) => setDatos({ ...datos, ejemplo: e.target.checked })} className="accent-[#b5121b]" />
            Completar con respuestas de ejemplo (para presentaciones)
          </label>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-acento">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Boton onClick={onCerrar}>Cancelar</Boton>
        <Boton tipo="principal" onClick={crear} disabled={pendiente}>{pendiente ? 'Creando…' : 'Crear y empezar'}</Boton>
      </div>
    </Modal>
  )
}
