import { requerirUsuario } from '@/lib/usuarios'
import FormPassword from './FormPassword'

export const metadata = { title: 'Mi cuenta · Gestión Hotelera' }

export default async function Page() {
  const u = await requerirUsuario()
  return (
    <div className="max-w-md space-y-5">
      <div>
        <h1 className="titulo">Mi cuenta</h1>
        <p className="text-sm text-neutral-500">{u.nombre} · {u.usuario}</p>
      </div>
      <section className="tarjeta rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <h2 className="mb-3 text-base font-bold">Cambiar contraseña</h2>
        <FormPassword />
      </section>
    </div>
  )
}
