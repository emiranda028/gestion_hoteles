import Pickup from '@/components/Pickup'
import { datosDelUsuario } from '@/lib/acceso'

export const metadata = { title: 'Forecast y pick up · Gestión Hotelera' }

export default async function Page() {
  const { demo, hoteles, pickup, forecast, dias } = await datosDelUsuario()
  const desde = `${Number((dias[dias.length - 1]?.f ?? '2000').slice(0, 4)) - 2}`
  // pick up: últimos 120 días de fotos; historia: 2 años (para comparar con el año anterior)
  const corte = pickup.reduce((m, p) => (p.r > m ? p.r : m), '')
  const limite = new Date(new Date(corte || '2000-01-01').getTime() - 120 * 864e5).toISOString().slice(0, 10)
  return (
    <Pickup demo={demo} hoteles={hoteles} forecast={forecast}
      pickup={pickup.filter((p) => p.r >= limite)} dias={dias.filter((d) => d.f >= desde)} />
  )
}
