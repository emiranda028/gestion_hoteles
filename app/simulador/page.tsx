import Simulador, { type Referencia } from '@/components/Simulador'
import { datosDelUsuario } from '@/lib/acceso'
import { agregar, agrupar, sumarDias } from '@/lib/kpi'

export const metadata = { title: 'Simulador de gestión · Gestión Hotelera' }

/** Indicadores de los últimos 12 meses de cada hotel, para precargar el simulador. */
async function referencias(): Promise<Referencia[]> {
  const d = await datosDelUsuario()
  if (!d.hasta) return []
  const desde = sumarDias(d.hasta, -364)
  return [...agrupar(d.dias.filter((x) => x.f >= desde), (x) => x.h).entries()].map(([id, dias]) => {
    const a = agregar(dias, 'usd')
    const r = (n: number) => Math.round(n * 10) / 10
    return {
      id,
      nombre: (d.hoteles.find((h) => h.id === id)?.nombre ?? id) + (d.demo ? ' (demo)' : ''),
      habitaciones: Math.round(a.disp / (a.dias || 1)),
      ocupacion: r(a.occ),
      adr: Math.round(a.adr),
      aybPct: a.ingHab ? r((100 * a.ingAyb) / a.ingHab) : 0,
      otrosPct: a.ingHab ? r((100 * a.ingOtros) / a.ingHab) : 0,
      moneda: 'USD',
    }
  })
}

export default async function Page() {
  return <Simulador referencias={await referencias()} />
}
