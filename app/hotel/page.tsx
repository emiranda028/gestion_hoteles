import ResumenHotel from '@/components/ResumenHotel'
import { datosDelUsuario } from '@/lib/acceso'

export const metadata = { title: 'Resumen ejecutivo · Gestión Hotelera' }

export default async function Page() {
  const { demo, hoteles, flashDias, disponibles } = await datosDelUsuario()
  return <ResumenHotel demo={demo} hoteles={hoteles} flashDias={flashDias} disponibles={disponibles} />
}
