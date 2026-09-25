'use client'
import { useActionState } from 'react'
import { iniciarSesion } from '../acciones'

export default function FormLogin({ volver }: { volver: string }) {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, {})
  return (
    <form action={accion} className="tarjeta space-y-4 rounded-xl bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
      <input type="hidden" name="volver" value={volver} />
      <label className="block text-sm">
        Usuario
        <input name="usuario" autoComplete="username" required autoFocus={!estado.usuario}
          key={estado.usuario ?? ""} defaultValue={estado.usuario}
          className="mt-1 w-full rounded-full border border-neutral-300 px-4 py-2 outline-none focus:border-marca" />
      </label>
      <label className="block text-sm">
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required autoFocus={!!estado.usuario}
          className="mt-1 w-full rounded-full border border-neutral-300 px-4 py-2 outline-none focus:border-marca" />
      </label>
      {estado.error && <p className="text-sm text-acento">{estado.error}</p>}
      <button type="submit" disabled={pendiente}
        className="w-full rounded-full bg-marca py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {pendiente ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
