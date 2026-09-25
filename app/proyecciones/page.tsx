import Proyecciones from '@/components/Proyecciones'
import { cargarDatos } from '@/lib/datos'

export const metadata = { title: 'Proyecciones · Gestión Hotelera' }

export default function Page() {
  const { demo, hoteles, dias } = cargarDatos()
  return <Proyecciones datos={{ demo, hoteles, dias }} />
}
