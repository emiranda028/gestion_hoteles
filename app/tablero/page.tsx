import Tablero from '@/components/Tablero'
import { datosDelUsuario } from '@/lib/acceso'
import { datosTablero } from '@/lib/datos'

export const metadata = { title: 'Tablero · Gestión Hotelera' }

export default async function Page() {
  return <Tablero datos={datosTablero(await datosDelUsuario())} />
}
