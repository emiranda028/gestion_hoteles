'use client'
import { useActionState } from 'react'
import EscenaHotel from '@/components/EscenaHotel'
import { borrarFotoPortada, guardarFotoPortada } from '../acciones'

type Hotel = { id: string; nombre: string; lugar: string; foto: string | null }

function FotoHotel({ h }: { h: Hotel }) {
  const [estado, accion, pendiente] = useActionState(guardarFotoPortada, {})
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <div className="aspect-[16/9] bg-neutral-100">
        {h.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/portada/${h.id}?v=${h.foto}`} alt={h.nombre} className="h-full w-full object-cover" />
        ) : (
          <EscenaHotel id={h.id} />
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="text-sm font-semibold">{h.nombre}</div>
        <div className="text-xs text-neutral-500">{h.foto ? 'Foto cargada' : 'Sin foto: se muestra la ilustración'}</div>
        <form action={accion} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="hotel" value={h.id} />
          <input type="file" name="foto" accept="image/jpeg,image/png,image/webp" required
            className="min-w-0 flex-1 text-xs file:mr-2 file:rounded-full file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-xs" />
          <button type="submit" disabled={pendiente}
            className="rounded-full bg-marca px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
            {pendiente ? 'Subiendo…' : h.foto ? 'Reemplazar' : 'Subir'}
          </button>
        </form>
        {h.foto && (
          <form action={borrarFotoPortada}>
            <input type="hidden" name="hotel" value={h.id} />
            <button type="submit" className="text-xs text-acento underline">Quitar foto</button>
          </form>
        )}
        {estado.error && <p className="text-xs text-acento">{estado.error}</p>}
        {estado.ok && <p className="text-xs text-emerald-700">{estado.ok}</p>}
      </div>
    </div>
  )
}

export default function FotosPortada({ hoteles }: { hoteles: Hotel[] }) {
  return (
    <section className="tarjeta rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-700">Fotos de la portada (pantalla de ingreso)</h2>
      <p className="mb-3 text-xs text-neutral-500">
        Horizontales, idealmente de 1600 px de ancho o más. Se guardan solo en el servidor.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {hoteles.map((h) => <FotoHotel key={h.id} h={h} />)}
      </div>
    </section>
  )
}
