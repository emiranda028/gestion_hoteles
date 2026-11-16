import { borrarUsuario } from '@/app/acciones'
import { cargarDatos } from '@/lib/datos'
import { ultimaActividad } from '@/lib/actividad'
import { leerUsuarios, publico, requerirAdmin } from '@/lib/usuarios'
import FormUsuario from './FormUsuario'

export const metadata = { title: 'Usuarios · Gestión Hotelera' }

const GRUPOS = [{ id: 'panatel', nombre: 'Panatel (Marriott BA, Sheraton MDQ, Sheraton Bariloche)' }, { id: 'numah', nombre: 'Numah (City Express)' }]

export default async function Page() {
  const yo = await requerirAdmin()
  const usuarios = leerUsuarios().map(publico).sort((a, b) => a.usuario.localeCompare(b.usuario))
  const datos = cargarDatos()
  const actividad = ultimaActividad()
  const fecha = (t?: string) => (t ? new Date(t).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }) : '—')
  const grupos = datos.demo ? [...GRUPOS, { id: 'demo', nombre: 'Grupo Demo' }] : GRUPOS
  const hoteles = datos.hoteles.filter((h) => h.activo).map(({ id, nombre, grupo }) => ({ id, nombre, grupo }))
  const nombreGrupo = (g: string) => (g === '*' ? 'Todos' : grupos.find((x) => x.id === g)?.nombre.split(' (')[0] ?? g)
  const ROLES = { admin: 'Administrador', gerencia: 'Gerencia', cliente: 'Cliente' }
  const ve = (u: (typeof usuarios)[number]) => {
    const solapas = u.rol !== 'admin' && u.secciones?.length ? ` · ${u.secciones.length} solapas` : ''
    if (u.rol !== 'cliente') return 'Todo' + solapas
    const base = u.hoteles?.length
      ? u.hoteles.map((h) => hoteles.find((x) => x.id === h)?.nombre ?? h).join(', ')
      : u.grupos.map(nombreGrupo).join(', ')
    return (u.disponibilidades === false ? `${base} · sin disponibilidades` : base) + solapas
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="titulo">Usuarios</h1>
        <p className="text-sm text-neutral-500">
          Administración de accesos. Gerencia ve todos los hoteles; cada cliente ve solo los grupos u hoteles asignados.
          «Última actividad» es la última vez que abrió la app (aunque tenga la sesión guardada); el detalle está en <a href="/admin/actividad" className="text-marca underline">Actividad</a>.
        </p>
      </div>

      {/* una tarjeta por usuario: al tocar «Editar» el formulario se abre a lo ancho de la tarjeta */}
      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {usuarios.map((u) => (
          <section key={u.usuario} className="tarjeta rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)] md:has-[details[open]]:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{u.nombre}</div>
                <div className="text-xs text-neutral-500 [overflow-wrap:anywhere]">{u.usuario}</div>
              </div>
              {u.activo ? <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Activo</span>
                : <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs text-acento">Inactivo</span>}
            </div>
            <div className="mt-2 text-sm text-neutral-600">{ROLES[u.rol]} · {ve(u)}</div>
            <div className="mt-1 text-xs text-neutral-500">Última actividad: {actividad.has(u.usuario)
              ? <a href={`/admin/actividad?usuario=${encodeURIComponent(u.usuario)}`} className="underline">{fecha(actividad.get(u.usuario))}</a>
              : '—'} · Inicio de sesión: {fecha(u.ultimoIngreso)}</div>
            <details className="group mt-3 border-t border-neutral-100 pt-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-marca [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Editar ▸</span><span className="hidden group-open:inline">Cerrar edición ▾</span>
              </summary>
              <div className="mt-3"><FormUsuario grupos={grupos} hoteles={hoteles} usuario={u} /></div>
              {u.usuario !== yo.usuario && (
                <form action={borrarUsuario} className="mt-3">
                  <input type="hidden" name="usuario" value={u.usuario} />
                  <button type="submit" className="text-xs text-acento underline">Eliminar usuario</button>
                </form>
              )}
            </details>
          </section>
        ))}
      </div>

      <section className="tarjeta max-w-3xl rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <h2 className="mb-3 text-base font-bold">Nuevo usuario</h2>
        <FormUsuario grupos={grupos} hoteles={hoteles} />
      </section>
    </div>
  )
}
