import RegistroPaises from '@/components/RegistroPaises'
import { cargarDatos } from '@/lib/datos'

export const metadata = { title: 'Registro por país · Gestión Hotelera' }

export default function Page() {
  const { demo, paises } = cargarDatos()
  return <RegistroPaises demo={demo} paises={paises} />
}
