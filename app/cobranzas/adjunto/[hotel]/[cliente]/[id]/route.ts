import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cargarDatos } from '@/lib/datos'
import { rutaArchivo } from '@/lib/gestion/almacen'
import { clientes } from '@/lib/gestion/cobranzas/datos'
import { seccionesPermitidas, usuarioActual, veHotel } from '@/lib/usuarios'

export async function GET(_: Request, { params }: { params: Promise<{ hotel: string; cliente: string; id: string }> }) {
  const { hotel, cliente, id } = await params
  const u = await usuarioActual()
  const h = cargarDatos().hoteles.find((x) => x.id === hotel)
  if (!u || !h || !veHotel(u, h) || !seccionesPermitidas(u).includes('/cobranzas')) return new Response('Prohibido', { status: 403 })
  const adj = clientes(hotel)[cliente]?.adjuntos?.find((a) => a.id === id)
  if (!adj) return new Response('No encontrado', { status: 404 })
  try {
    const datos = await readFile(path.join(rutaArchivo('cobranzas', hotel, 'adjuntos', path.basename(cliente)), path.basename(id)))
    return new Response(datos, { headers: { 'Content-Type': adj.tipo, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(adj.nombre)}`, 'Cache-Control': 'private, no-store' } })
  } catch {
    return new Response('No encontrado', { status: 404 })
  }
}
