import Tablero from '@/components/Tablero'
import { datosTablero } from '@/lib/datos'

export default function Page() {
  return <Tablero datos={datosTablero()} />
}
