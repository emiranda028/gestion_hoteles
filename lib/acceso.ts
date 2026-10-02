import 'server-only'
import { type Datos, cargarDatos } from './datos'
import { redirect } from 'next/navigation'
import { permisos, requerirUsuario, seccionesPermitidas, veHotel } from './usuarios'

/** Datos que puede ver el usuario de la sesión: solo los hoteles y grupos que tiene asignados. */
export async function datosDelUsuario(seccion: string): Promise<Datos> {
  const u = await requerirUsuario()
  const permitidas = seccionesPermitidas(u)
  if (!permitidas.includes(seccion)) redirect(permitidas[0] ?? '/cuenta')
  const d = cargarDatos()
  const p = permisos(u)
  if (p.todo) return { ...d, verDisponibilidades: true }
  const grupos = p.grupos
  const hoteles = d.hoteles.filter((h) => veHotel(u, h))
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
    disponibles: p.disponibilidades ? d.disponibles.filter((x) => grupos.has(x.g)) : [],
    cuentas: p.disponibilidades ? d.cuentas.filter((x) => grupos.has(x.g)) : [],
    verDisponibilidades: p.disponibilidades,
    ingesta: null,
  }
}
