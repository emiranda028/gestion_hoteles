import Disponibilidades from '@/components/Disponibilidades'
import { datosDelUsuario } from '@/lib/acceso'

export const metadata = { title: 'Disponibilidades · Gestión Hotelera' }

export default async function Page() {
  const { demo, grupos, disponibles, cuentas } = await datosDelUsuario()
  return <Disponibilidades demo={demo} grupos={grupos} disponibles={disponibles} cuentas={cuentas} />
}
