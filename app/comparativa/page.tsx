import ComparativaHF from '@/components/ComparativaHF'
import { datosDelUsuario } from '@/lib/acceso'

export const metadata = { title: 'Comparativa H&F · Gestión Hotelera' }

export default async function Page() {
  const { demo, hoteles, hfDias } = await datosDelUsuario()
  // alcanza con los últimos 14 meses (para comparar con el año anterior) y sin forecast lejano
  const ultimo = hfDias.filter((d) => d.tipo === 'History').reduce((m, d) => (d.f > m ? d.f : m), '')
  const desde = `${Number(ultimo.slice(0, 4)) - 1}-${ultimo.slice(5, 7)}-01`
  const hasta = new Date(new Date(ultimo || Date.now()).getTime() + 2 * 864e5).toISOString().slice(0, 10)
  const cols = hfDias.filter((d) => d.f >= desde && d.f <= hasta)
  return <ComparativaHF demo={demo} hoteles={hoteles} hfDias={cols} />
}
