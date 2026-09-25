import Disponibilidades from '@/components/Disponibilidades'
import { cargarDatos } from '@/lib/datos'

export const metadata = { title: 'Disponibilidades · Gestión Hotelera' }

export default function Page() {
  const { demo, grupos, disponibles, cuentas } = cargarDatos()
  return <Disponibilidades demo={demo} grupos={grupos} disponibles={disponibles} cuentas={cuentas} />
}
