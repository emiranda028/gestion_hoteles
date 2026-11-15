import CuentasCorporativas from '@/components/CuentasCorporativas'
import { datosDelUsuario } from '@/lib/acceso'

export const metadata = { title: 'Cuentas corporativas · Gestión Hotelera' }

export default async function Page() {
  const { demo, corporativas, tarifasCorp, hfDias } = await datosDelUsuario('/corporativas')
  // habitaciones ocupadas del hotel por mes (solo lo ya ocurrido), para ver cuánto pesan las cuentas corporativas
  const hotel: Record<string, number> = {}
  for (const d of hfDias) if (d.h === 'marriott' && d.tipo === 'History') hotel[d.f.slice(0, 7)] = (hotel[d.f.slice(0, 7)] ?? 0) + d.occ
  return <CuentasCorporativas demo={demo} filas={corporativas} tarifas={tarifasCorp} ocupadasHotel={hotel} />
}
