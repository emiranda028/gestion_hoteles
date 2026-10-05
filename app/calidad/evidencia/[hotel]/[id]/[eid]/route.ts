import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cargarDatos } from '@/lib/datos'
import { rutaArchivo } from '@/lib/gestion/almacen'
import { auditoria } from '@/lib/gestion/calidad/datos'
import { seccionesPermitidas, usuarioActual, veHotel } from '@/lib/usuarios'

// Descarga de una evidencia: solo para usuarios con acceso a Calidad y a ese hotel
export async function GET(_: Request, { params }: { params: Promise<{ hotel: string; id: string; eid: string }> }) {
  const { hotel, id, eid } = await params
  const u = await usuarioActual()
  const h = cargarDatos().hoteles.find((x) => x.id === hotel)
  if (!u || !h || !veHotel(u, h) || !seccionesPermitidas(u).includes('/calidad')) return new Response('Prohibido', { status: 403 })
  const a = auditoria(hotel, id)
  const ev = a && Object.values(a.respuestas).flatMap((r) => r.ev ?? []).find((e) => e.id === eid)
  if (!ev) return new Response('No encontrado', { status: 404 })
  try {
    const datos = await readFile(path.join(rutaArchivo('calidad', hotel, 'evidencias', id), path.basename(eid)))
    return new Response(datos, {
      headers: {
        'Content-Type': ev.tipo,
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(ev.nombre)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return new Response('No encontrado', { status: 404 })
  }
}
