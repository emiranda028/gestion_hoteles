import CalidadInicio from '@/components/gestion/calidad/Inicio'
import { accesoGestion } from '@/lib/acceso'
import { accionesAbiertas, resumirPrograma } from '@/lib/gestion/calidad/calculo'
import { auditorias } from '@/lib/gestion/calidad/datos'
import { PROGRAMAS } from '@/lib/gestion/calidad/programas'

export const metadata = { title: 'Calidad · Gestión Hotelera' }

export default async function Page({ searchParams }: { searchParams: Promise<{ hotel?: string }> }) {
  const { usuario, hoteles } = await accesoGestion('/calidad')
  const { hotel: pedido } = await searchParams
  const hotel = hoteles.find((h) => h.id === pedido) ?? hoteles[0]
  if (!hotel) return <p className="text-sm text-neutral-500">No tenés hoteles asignados.</p>

  // resúmenes calculados en el servidor: al navegador no viajan los catálogos completos
  const lista = auditorias(hotel.id).map((a) => {
    const prog = PROGRAMAS.find((p) => p.id === a.programa)!
    const r = resumirPrograma(prog, a.respuestas)
    const acciones = accionesAbiertas(prog, a.respuestas, a.plan)
    return {
      id: a.id, programa: a.programa, titulo: a.titulo, periodo: a.periodo, fecha: a.fecha, auditor: a.auditor,
      estado: a.estado, ejemplo: !!a.ejemplo, cumplimiento: r.cumplimiento, cobertura: r.cobertura, noCumple: r.noCumple, acciones,
    }
  }).sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <CalidadInicio
      hotel={hotel.id} hoteles={hoteles.map(({ id, nombre }) => ({ id, nombre }))}
      programas={PROGRAMAS.map((p) => ({ id: p.id, nombre: p.nombre, descripcion: p.descripcion, items: p.nodos.reduce((s, n) => s + countItems(n), 0), areas: p.nodos.length }))}
      auditorias={lista} usuario={{ nombre: usuario.nombre, admin: usuario.rol === 'admin' }}
    />
  )
}

function countItems(n: { items?: unknown[]; hijos?: { items?: unknown[]; hijos?: unknown[] }[] }): number {
  return (n.items?.length ?? 0) + (n.hijos ?? []).reduce((s: number, h) => s + countItems(h as never), 0)
}
