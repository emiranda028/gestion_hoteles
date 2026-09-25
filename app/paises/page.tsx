import RegistroPaises from '@/components/RegistroPaises'
import { datosDelUsuario } from '@/lib/acceso'

export const metadata = { title: 'Registro por país · Gestión Hotelera' }

export default async function Page() {
  const { demo, paises } = await datosDelUsuario()
  return <RegistroPaises demo={demo} paises={paises} />
}
