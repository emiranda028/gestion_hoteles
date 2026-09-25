'use client'
import { useActionState, useState } from 'react'
import { guardarUsuario } from '@/app/acciones'
import type { UsuarioPublico } from '@/lib/usuarios'

const campo = 'mt-1 w-full rounded-full border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-marca'

export default function FormUsuario({ grupos, usuario }: { grupos: { id: string; nombre: string }[]; usuario?: UsuarioPublico }) {
  const [estado, accion, pendiente] = useActionState(guardarUsuario, {})
  const [rol, setRol] = useState(usuario?.rol ?? 'cliente')
  const nuevo = !usuario
  return (
    <form action={accion} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="nuevo" value={nuevo ? '1' : '0'} />
      <label className="text-xs text-neutral-600">Usuario (o email)
        {nuevo ? <input name="usuario" required className={campo} autoComplete="off" />
          : <><input type="hidden" name="usuario" value={usuario.usuario} /><div className="mt-1 py-1.5 text-sm">{usuario.usuario}</div></>}
      </label>
      <label className="text-xs text-neutral-600">Nombre
        <input name="nombre" required defaultValue={usuario?.nombre} className={campo} />
      </label>
      <label className="text-xs text-neutral-600">Rol
        <select name="rol" value={rol} onChange={(e) => setRol(e.target.value as 'admin' | 'cliente')} className={campo}>
          <option value="cliente">Cliente (ve solo sus hoteles)</option>
          <option value="admin">Administrador LTELC (ve todo y gestiona usuarios)</option>
        </select>
      </label>
      <label className="text-xs text-neutral-600">{nuevo ? 'Contraseña' : 'Nueva contraseña (vacío = no cambiar)'}
        <input name="password" type="password" required={nuevo} autoComplete="new-password" className={campo} placeholder="mínimo 10, letras y números" />
      </label>
      {rol === 'cliente' && (
        <fieldset className="text-xs text-neutral-600 sm:col-span-2">
          <legend>Grupos que puede ver</legend>
          <div className="mt-1 flex flex-wrap gap-4">
            {grupos.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm text-neutral-900">
                <input type="checkbox" name="grupos" value={g.id} defaultChecked={usuario?.grupos.includes(g.id)} className="accent-[#b5121b]" />
                {g.nombre}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="activo" defaultChecked={usuario?.activo ?? true} className="accent-[#b5121b]" /> Activo
      </label>
      <div className="flex items-center justify-end gap-3 sm:col-span-2">
        {estado.error && <span className="text-sm text-acento">{estado.error}</span>}
        {estado.ok && <span className="text-sm text-emerald-700">{estado.ok}</span>}
        <button type="submit" disabled={pendiente} className="rounded-full bg-marca px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {pendiente ? 'Guardando…' : nuevo ? 'Crear usuario' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
