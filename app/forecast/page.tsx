import Forecast from '@/components/gestion/forecast/Forecast'
import { accesoGestion } from '@/lib/acceso'
import { cargarDatos } from '@/lib/datos'
import * as db from '@/lib/gestion/forecast/datos'

export const metadata = { title: 'Forecast y Budget · Gestión Hotelera' }

export default async function Page({ searchParams }: { searchParams: Promise<{ hotel?: string; anio?: string }> }) {
  const { usuario, hoteles } = await accesoGestion('/forecast')
  const sp = await searchParams
  const hotel = hoteles.find((h) => h.id === sp.hotel) ?? hoteles[0]
  if (!hotel) return <p className="text-sm text-neutral-500">No tenés hoteles asignados.</p>
  const anio = Number(sp.anio) || new Date().getFullYear()
  const tc = db.tcMensual()
  // control contra lo que informa Opera (History & Forecast) para el total del hotel
  const opera: Record<string, { rn: number; rev: number }> = {}
  for (const d of cargarDatos().dias) {
    if (d.h !== hotel.id || !d.f.startsWith(String(anio))) continue
    const m = d.f.slice(0, 7)
    opera[m] = { rn: (opera[m]?.rn ?? 0) + d.ocup, rev: (opera[m]?.rev ?? 0) + d.ingHab }
  }
  return (
    <Forecast
      hotel={{ id: hotel.id, nombre: hotel.nombre, habitaciones: hotel.habitaciones }}
      hoteles={hoteles.map(({ id, nombre }) => ({ id, nombre }))}
      anio={anio} estructura={db.estructura(hotel.id)}
      actual={db.anio(hotel.id, anio, hotel.habitaciones)} previo={db.existe(hotel.id, anio - 1) ? db.anio(hotel.id, anio - 1, hotel.habitaciones) : undefined}
      tc={tc} opera={opera} usuario={{ nombre: usuario.nombre, rol: usuario.rol }}
    />
  )
}
