import { notFound } from 'next/navigation'
import AuditoriaVista from '@/components/gestion/calidad/Auditoria'
import { accesoGestion } from '@/lib/acceso'
import { itemsDe, resumirItems } from '@/lib/gestion/calidad/calculo'
import { auditoria, auditorias } from '@/lib/gestion/calidad/datos'
import { programa } from '@/lib/gestion/calidad/programas'

export const metadata = { title: 'Auditoría · Calidad · Gestión Hotelera' }

export default async function Page({ params }: { params: Promise<{ hotel: string; id: string }> }) {
  const { usuario, hoteles } = await accesoGestion('/calidad')
  const { hotel, id } = await params
  const h = hoteles.find((x) => x.id === hotel)
  const a = h && auditoria(hotel, id)
  const prog = a && programa(a.programa)
  if (!h || !a || !prog) notFound()

  // auditoría cerrada anterior del mismo programa, para comparar por área
  const anterior = auditorias(hotel)
    .filter((x) => x.programa === a.programa && x.estado === 'cerrada' && x.id !== a.id && x.fecha <= a.fecha)
    .sort((x, y) => y.fecha.localeCompare(x.fecha))[0]
  const comparacion = anterior ? {
    titulo: anterior.titulo,
    porNodo: Object.fromEntries(prog.nodos.map((n) => [n.c, resumirItems(prog, itemsDe(n), anterior.respuestas).cumplimiento])),
    global: resumirItems(prog, prog.nodos.flatMap(itemsDe), anterior.respuestas).cumplimiento,
  } : null

  return (
    <AuditoriaVista hotel={h.nombre} programa={prog} auditoria={a} comparacion={comparacion}
      usuario={{ nombre: usuario.nombre, rol: usuario.rol }} />
  )
}
