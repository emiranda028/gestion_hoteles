'use client'
import { useActionState, useState } from 'react'
import { guardarUsuario } from '@/app/acciones'
import { SECCIONES } from '@/lib/secciones'
import type { Rol, UsuarioPublico } from '@/lib/usuarios'

const campo = 'mt-1 w-full rounded-full border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-marca'
const check = 'accent-[#b5121b]'

type Grupo = { id: string; nombre: string }
type Hotel = { id: string; nombre: string; grupo: string }

export default function FormUsuario({ grupos, hoteles, usuario }: { grupos: Grupo[]; hoteles: Hotel[]; usuario?: UsuarioPublico }) {
  const [estado, accion, pendiente] = useActionState(guardarUsuario, {})
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? 'cliente')
  const [marcados, setMarcados] = useState<string[]>(usuario?.grupos.filter((g) => g !== '*') ?? [])
  const [alcance, setAlcance] = useState<'grupo' | 'hoteles'>(usuario?.hoteles?.length ? 'hoteles' : 'grupo')
  const nuevo = !usuario
  const hotelesVisibles = hoteles.filter((h) => marcados.includes(h.grupo))

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
        <select name="rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)} className={campo}>
          <option value="cliente">Cliente (ve solo los hoteles asignados)</option>
          <option value="gerencia">Gerencia (ve todos los hoteles, sin administración)</option>
          <option value="admin">Administrador LTELC (ve todo y administra)</option>
        </select>
      </label>
      <label className="text-xs text-neutral-600">{nuevo ? 'Contraseña' : 'Nueva contraseña (vacío = no cambiar)'}
        <input name="password" type="password" required={nuevo} autoComplete="new-password" className={campo} placeholder="mínimo 10, letras y números" />
      </label>

      {rol === 'cliente' && (
        <div className="space-y-3 rounded-xl bg-neutral-50 p-3 sm:col-span-2">
          <fieldset className="text-xs text-neutral-600">
            <legend>Grupos</legend>
            <div className="mt-1 flex flex-wrap gap-4">
              {grupos.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm text-neutral-900">
                  <input type="checkbox" name="grupos" value={g.id} checked={marcados.includes(g.id)} className={check}
                    onChange={(e) => setMarcados((m) => (e.target.checked ? [...m, g.id] : m.filter((x) => x !== g.id)))} />
                  {g.nombre}
                </label>
              ))}
            </div>
          </fieldset>

          {marcados.length > 0 && (
            <fieldset className="text-xs text-neutral-600">
              <legend>Hoteles</legend>
              <div className="mt-1 flex flex-wrap gap-4 text-sm text-neutral-900">
                <label className="flex items-center gap-2">
                  <input type="radio" name="alcance" value="grupo" checked={alcance === 'grupo'} onChange={() => setAlcance('grupo')} className={check} />
                  Todos los hoteles de los grupos marcados
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="alcance" value="hoteles" checked={alcance === 'hoteles'} onChange={() => setAlcance('hoteles')} className={check} />
                  Solo estos hoteles:
                </label>
              </div>
              {alcance === 'hoteles' && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 pl-6">
                  {hotelesVisibles.map((h) => (
                    <label key={h.id} className="flex items-center gap-2 text-sm text-neutral-900">
                      <input type="checkbox" name="hoteles" value={h.id} defaultChecked={usuario?.hoteles?.includes(h.id)} className={check} />
                      {h.nombre}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="disponibilidades" defaultChecked={usuario ? usuario.disponibilidades !== false : true} className={check} />
            Ve las disponibilidades de sus grupos (saldos bancarios)
          </label>
        </div>
      )}

      {rol !== 'admin' && (
        <fieldset className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 sm:col-span-2">
          <legend className="px-1">Solapas que puede ver</legend>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {SECCIONES.map((x) => (
              <label key={x.href} className="flex items-center gap-2 text-sm text-neutral-900">
                <input type="checkbox" name="secciones" value={x.href} className={check}
                  defaultChecked={!usuario?.secciones?.length || usuario.secciones.includes(x.href)} />
                {x.texto}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="activo" defaultChecked={usuario?.activo ?? true} className={check} /> Activo
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
