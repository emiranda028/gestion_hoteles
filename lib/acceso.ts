import 'server-only'
import { type Datos, cargarDatos } from './datos'
import { requerirUsuario } from './usuarios'

/** Datos que puede ver el usuario de la sesión: solo los hoteles y grupos que tiene asignados. */
export async function datosDelUsuario(): Promise<Datos> {
  const u = await requerirUsuario()
  const d = cargarDatos()
  if (u.grupos.includes('*')) return d
  const grupos = new Set(u.grupos)
  const hoteles = d.hoteles.filter((h) => grupos.has(h.grupo))
  const ids = new Set(hoteles.map((h) => h.id))
  const deHotel = <T extends { h: string }>(xs: T[]) => xs.filter((x) => ids.has(x.h))
  return {
    ...d,
    hoteles,
    grupos: d.grupos.filter((g) => grupos.has(g.id)),
    dias: deHotel(d.dias),
    forecast: deHotel(d.forecast),
    pickup: deHotel(d.pickup),
    flash: deHotel(d.flash),
    flashDias: deHotel(d.flashDias),
    hfDias: deHotel(d.hfDias),
    bonvoy: deHotel(d.bonvoy),
    bonvoyDias: deHotel(d.bonvoyDias),
    paises: deHotel(d.paises),
    disponibles: d.disponibles.filter((x) => grupos.has(x.g)),
    cuentas: d.cuentas.filter((x) => grupos.has(x.g)),
    ingesta: null,
  }
}
