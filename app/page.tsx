import ResumenEjecutivo from '@/components/ResumenEjecutivo'
import { cargarDatos } from '@/lib/datos'

export default function Page() {
  const { demo, grupos, hoteles, flashDias, disponibles } = cargarDatos()
  return <ResumenEjecutivo demo={demo} grupos={grupos} hoteles={hoteles} flashDias={flashDias} disponibles={disponibles} />
}
