import Tablero from '@/components/Tablero'
import { datosTablero } from '@/lib/datos'

export const metadata = { title: 'Tablero · Gestión Hotelera' }

export default function Page() {
  return <Tablero datos={datosTablero()} />
}
