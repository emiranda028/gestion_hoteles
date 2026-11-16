'use client'
import { useActionState } from 'react'
import { subirReporte } from '../acciones'

export default function SubirReporte() {
  const [estado, accion, pendiente] = useActionState(subirReporte, {})
  return (
    <section className="tarjeta rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-neutral-700">Cargar un reporte a mano</h2>
      <p className="mb-3 text-xs text-neutral-500">
        Para un reporte que no llegó por mail o una planilla que se actualiza en Drive: Registro por país (Venta x PAÍS),
        Cuentas corporativas (Spc Corp), disponibilidades o reportes de Opera en PDF. Se procesa igual que los del correo.
      </p>
      <form action={accion} className="flex flex-wrap items-center gap-2">
        <input type="file" name="archivo" accept=".pdf,.xlsx,.xlsm,.zip" required
          className="min-w-0 flex-1 text-sm file:mr-2 file:rounded-full file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm" />
        <button type="submit" disabled={pendiente}
          className="rounded-full bg-marca px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
          {pendiente ? 'Procesando…' : 'Cargar'}
        </button>
      </form>
      {estado.error && <p className="mt-3 text-sm text-acento">{estado.error}</p>}
      {estado.ok && <p className="mt-3 text-sm text-emerald-700">{estado.ok}</p>}
      {!!estado.detalle?.length && (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-50 p-2 text-[11px] leading-relaxed text-neutral-600">{estado.detalle.join('\n')}</pre>
      )}
    </section>
  )
}
