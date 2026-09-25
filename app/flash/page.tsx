import ManagerFlash from '@/components/ManagerFlash'
import { cargarDatos } from '@/lib/datos'

export const metadata = { title: 'Manager Flash · Gestión Hotelera' }

export default function Page() {
  const { demo, hoteles, flashDias } = cargarDatos()
  return <ManagerFlash demo={demo} hoteles={hoteles} flashDias={flashDias} />
}
