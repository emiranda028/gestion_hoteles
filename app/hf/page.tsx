import HistoryForecast from '@/components/HistoryForecast'
import { cargarDatos } from '@/lib/datos'

export const metadata = { title: 'History & Forecast · Gestión Hotelera' }

export default function Page() {
  const { demo, hoteles, hfDias, bonvoyDias } = cargarDatos()
  // últimos dos años + forecast (para comparar con el año anterior sin mandar toda la historia)
  const ultimo = hfDias.reduce((m, d) => (d.f > m ? d.f : m), '')
  const desde = `${Number(ultimo.slice(0, 4)) - 2}${ultimo.slice(4, 7)}-01`
  return <HistoryForecast demo={demo} hoteles={hoteles} hfDias={hfDias.filter((d) => d.f >= desde)} bonvoyDias={bonvoyDias} />
}
