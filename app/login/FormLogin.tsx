'use client'
import { useActionState } from 'react'
import { iniciarSesion } from '../acciones'

export default function FormLogin({ volver }: { volver: string }) {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, {})
  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="volver" value={volver} />
      <label className="block text-sm font-medium">
        Usuario
        <input name="usuario" autoComplete="username" required autoFocus={!estado.usuario}
          key={estado.usuario ?? ""} defaultValue={estado.usuario}
          className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-base outline-none transition focus:border-marca focus:bg-white focus:ring-2 focus:ring-marca/10" />
      </label>
      <label className="block text-sm font-medium">
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required autoFocus={!!estado.usuario}
          className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-base outline-none transition focus:border-marca focus:bg-white focus:ring-2 focus:ring-marca/10" />
      </label>
      {estado.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-acento">{estado.error}</p>}
      <button type="submit" disabled={pendiente}
        className="w-full rounded-xl bg-marca py-3 text-base font-semibold text-white transition hover:bg-black disabled:opacity-60">
        {pendiente ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
