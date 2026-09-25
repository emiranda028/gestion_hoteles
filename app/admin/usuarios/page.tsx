import { borrarUsuario } from '@/app/acciones'
import { cargarDatos } from '@/lib/datos'
import { leerUsuarios, publico, requerirAdmin } from '@/lib/usuarios'
import FormUsuario from './FormUsuario'

export const metadata = { title: 'Usuarios · Gestión Hotelera' }

const GRUPOS = [{ id: 'panatel', nombre: 'Panatel (Marriott BA, Sheraton MDQ, Sheraton Bariloche)' }, { id: 'numah', nombre: 'Numah (City Express)' }]

export default async function Page() {
  const yo = await requerirAdmin()
  const usuarios = leerUsuarios().map(publico).sort((a, b) => a.usuario.localeCompare(b.usuario))
  const grupos = cargarDatos().demo ? [...GRUPOS, { id: 'demo', nombre: 'Grupo Demo' }] : GRUPOS
  const nombreGrupo = (g: string) => (g === '*' ? 'Todos' : grupos.find((x) => x.id === g)?.nombre.split(' (')[0] ?? g)
  return (
    <div className="space-y-5">
      <div>
        <h1 className="titulo">Usuarios</h1>
        <p className="text-sm text-neutral-500">
          Administración de accesos de LTELC. Los clientes solo ven los hoteles de los grupos que tienen asignados.
        </p>
      </div>

      <section className="tarjeta overflow-x-auto rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-marca text-left text-[11px] uppercase tracking-wide text-neutral-500">
            <tr><th className="py-2 pr-3">Usuario</th><th className="pr-3">Nombre</th><th className="pr-3">Rol</th><th className="pr-3">Ve</th><th className="pr-3">Estado</th><th className="pr-3">Último ingreso</th><th /></tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.usuario} className="border-b border-neutral-100 align-top">
                <td className="py-2 pr-3 font-medium">{u.usuario}</td>
                <td className="py-2 pr-3">{u.nombre}</td>
                <td className="py-2 pr-3">{u.rol === 'admin' ? 'Administrador' : 'Cliente'}</td>
                <td className="py-2 pr-3">{u.grupos.map(nombreGrupo).join(', ')}</td>
                <td className="py-2 pr-3">{u.activo ? <span className="text-emerald-700">Activo</span> : <span className="text-acento">Inactivo</span>}</td>
                <td className="py-2 pr-3 text-neutral-500">{u.ultimoIngreso ? new Date(u.ultimoIngreso).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '—'}</td>
                <td className="py-2">
                  <details className="text-right">
                    <summary className="cursor-pointer text-xs text-marca underline">Editar</summary>
                    <div className="mt-2 text-left"><FormUsuario grupos={grupos} usuario={u} /></div>
                    {u.usuario !== yo.usuario && (
                      <form action={borrarUsuario} className="mt-2">
                        <input type="hidden" name="usuario" value={u.usuario} />
                        <button type="submit" className="text-xs text-acento underline">Eliminar usuario</button>
                      </form>
                    )}
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="tarjeta max-w-2xl rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <h2 className="mb-3 text-base font-bold">Nuevo usuario</h2>
        <FormUsuario grupos={grupos} />
      </section>
    </div>
  )
}
