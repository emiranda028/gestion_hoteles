import Proyecciones from '@/components/Proyecciones'
import { datosDelUsuario } from '@/lib/acceso'

export const metadata = { title: 'Proyecciones · Gestión Hotelera' }

export default async function Page() {
  const { demo, hoteles, dias } = await datosDelUsuario()
  return <Proyecciones datos={{ demo, hoteles, dias }} />
}
