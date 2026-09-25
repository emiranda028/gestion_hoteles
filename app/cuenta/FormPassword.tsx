'use client'
import { useActionState } from 'react'
import { cambiarMiPassword } from '@/app/acciones'

const campo = 'mt-1 w-full rounded-full border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-marca'

export default function FormPassword() {
  const [estado, accion, pendiente] = useActionState(cambiarMiPassword, {})
  return (
    <form action={accion} className="space-y-3">
      <label className="block text-xs text-neutral-600">Contraseña actual
        <input name="actual" type="password" required autoComplete="current-password" className={campo} />
      </label>
      <label className="block text-xs text-neutral-600">Nueva contraseña
        <input name="nueva" type="password" required autoComplete="new-password" className={campo} placeholder="mínimo 10, letras y números" />
      </label>
      {estado.error && <p className="text-sm text-acento">{estado.error}</p>}
      {estado.ok && <p className="text-sm text-emerald-700">{estado.ok}</p>}
      <button type="submit" disabled={pendiente} className="rounded-full bg-marca px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pendiente ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  )
}
