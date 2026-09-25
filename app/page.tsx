import Tablero from '@/components/Tablero'
import { cargarDatos } from '@/lib/datos'

export default function Page() {
  return <Tablero datos={cargarDatos()} />
}
