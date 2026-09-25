import ManagerFlash from '@/components/ManagerFlash'
import { datosDelUsuario } from '@/lib/acceso'

export const metadata = { title: 'Manager Flash · Gestión Hotelera' }

export default async function Page() {
  const { demo, hoteles, flashDias } = await datosDelUsuario()
  return <ManagerFlash demo={demo} hoteles={hoteles} flashDias={flashDias} />
}
