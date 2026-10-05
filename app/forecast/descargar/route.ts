import { cargarDatos } from '@/lib/datos'
import { celda, mesesConReal } from '@/lib/gestion/forecast/calculo'
import * as db from '@/lib/gestion/forecast/datos'
import { plantilla } from '@/lib/gestion/forecast/excel'
import { seccionesPermitidas, usuarioActual, veHotel } from '@/lib/usuarios'

// Excel con el formato de importación: vacío (plantilla) o con los valores de una capa
export async function GET(req: Request) {
  const url = new URL(req.url)
  const hotel = url.searchParams.get('hotel') ?? '', anio = Number(url.searchParams.get('anio')), capa = url.searchParams.get('capa') ?? 'vacia'
  const u = await usuarioActual()
  const h = cargarDatos().hoteles.find((x) => x.id === hotel)
  if (!u || !h || !veHotel(u, h) || !seccionesPermitidas(u).includes('/forecast')) return new Response('Prohibido', { status: 403 })
  const a = db.anio(hotel, anio, h.habitaciones), previo = db.anio(hotel, anio - 1, h.habitaciones)
  const cerrados = mesesConReal(a)
  const nombres: Record<string, string> = { budget: 'Budget', real: 'Real', forecast: 'Forecast', vacia: 'Plantilla' }
  const buffer = await plantilla(db.estructura(hotel), (k, m) => {
    if (capa === 'vacia') return null
    if (capa === 'real' && !cerrados[m]) return null
    return celda(capa as 'budget' | 'real' | 'forecast', k, m, a, previo, cerrados)
  }, `${nombres[capa] ?? capa} ${anio} · ${h.nombre}`)
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`${nombres[capa] ?? capa} ${anio} ${h.nombre}.xlsx`)}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
