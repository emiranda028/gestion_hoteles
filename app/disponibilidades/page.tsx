import Disponibilidades from '@/components/Disponibilidades'
import { datosDelUsuario } from '@/lib/acceso'

export const metadata = { title: 'Disponibilidades · Gestión Hotelera' }

export default async function Page() {
  const { demo, grupos, disponibles, cuentas, verDisponibilidades } = await datosDelUsuario('/disponibilidades')
  if (verDisponibilidades === false) {
    return <p className="rounded-xl bg-white p-6 text-sm text-neutral-500">Tu usuario no tiene acceso a las disponibilidades.</p>
  }
  return <Disponibilidades demo={demo} grupos={grupos} disponibles={disponibles} cuentas={cuentas} />
}
