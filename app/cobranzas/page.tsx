import Cobranzas from '@/components/gestion/cobranzas/Cobranzas'
import { accesoGestion } from '@/lib/acceso'
import * as db from '@/lib/gestion/cobranzas/datos'

export const metadata = { title: 'Cobranzas · Gestión Hotelera' }

export default async function Page({ searchParams }: { searchParams: Promise<{ hotel?: string }> }) {
  const { usuario, hoteles } = await accesoGestion('/cobranzas')
  const { hotel: pedido } = await searchParams
  const hotel = hoteles.find((h) => h.id === pedido) ?? hoteles[0]
  if (!hotel) return <p className="text-sm text-neutral-500">No tenés hoteles asignados.</p>
  return (
    <Cobranzas
      hotel={{ id: hotel.id, nombre: hotel.nombre }} hoteles={hoteles.map(({ id, nombre }) => ({ id, nombre }))}
      base={db.base(hotel.id)} clientes={db.clientes(hotel.id)} gestiones={db.gestiones(hotel.id)}
      previstas={db.previstas(hotel.id)} listas={db.listas(hotel.id)}
      usuario={{ nombre: usuario.nombre, rol: usuario.rol }}
    />
  )
}
