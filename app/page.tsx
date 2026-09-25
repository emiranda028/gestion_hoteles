import ResumenEjecutivo from '@/components/ResumenEjecutivo'
import { datosDelUsuario } from '@/lib/acceso'

export default async function Page() {
  const { demo, grupos, hoteles, flashDias, disponibles } = await datosDelUsuario()
  return <ResumenEjecutivo demo={demo} grupos={grupos} hoteles={hoteles} flashDias={flashDias} disponibles={disponibles} />
}
