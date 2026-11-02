import Link from 'next/link'
import { leerActividad, type Evento } from '@/lib/actividad'
import { SECCIONES } from '@/lib/secciones'
import { leerUsuarios, requerirAdmin } from '@/lib/usuarios'

export const metadata = { title: 'Actividad · Gestión Hotelera' }

const PERIODOS = [{ dias: 1, texto: 'Hoy' }, { dias: 7, texto: '7 días' }, { dias: 30, texto: '30 días' }, { dias: 90, texto: '90 días' }]
const ZONA = 'America/Argentina/Buenos_Aires'
const nombreSolapa = (s?: string) => SECCIONES.find((x) => x.href === s)?.texto ?? s ?? ''
const dia = (t: string) => new Date(t).toLocaleDateString('en-CA', { timeZone: ZONA })
const fechaHora = (t: string) => new Date(t).toLocaleString('es-AR', { timeZone: ZONA, dateStyle: 'short', timeStyle: 'short' })
const tarjeta = 'tarjeta rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]'

export default async function Page({ searchParams }: { searchParams: Promise<{ dias?: string; usuario?: string }> }) {
  await requerirAdmin()
  const q = await searchParams
  const dias = PERIODOS.some((p) => String(p.dias) === q.dias) ? Number(q.dias) : 7
  const usuarios = leerUsuarios()
  const nombre = (u: string) => usuarios.find((x) => x.usuario === u)?.nombre ?? u
  const elegido = usuarios.some((x) => x.usuario === q.usuario) ? q.usuario! : ''

  // "Hoy" = desde la medianoche de Argentina
  const todos = leerActividad(dias + 1).filter((e) => (dias === 1 ? dia(e.t) === dia(new Date().toISOString()) : Date.parse(e.t) >= Date.now() - dias * 864e5))
  const eventos = elegido ? todos.filter((e) => e.u === elegido) : todos
  const vistas = eventos.filter((e) => e.tipo === 'vista')

  const porUsuario = [...new Set(eventos.map((e) => e.u))].map((u) => {
    const de = eventos.filter((e) => e.u === u)
    const v = de.filter((e) => e.tipo === 'vista')
    return { u, ultima: de[0].t, dias: new Set(de.map((e) => dia(e.t))).size, vistas: v.length, top: ranking(v).slice(0, 3) }
  }).sort((a, b) => b.ultima.localeCompare(a.ultima))
  const porSolapa = ranking(vistas).map((x) => ({ ...x, usuarios: new Set(vistas.filter((e) => e.s === x.s).map((e) => e.u)).size }))
  const maxSolapa = Math.max(1, ...porSolapa.map((x) => x.n))
  const enlace = (cambios: { dias?: number; usuario?: string }) => {
    const p = new URLSearchParams({ dias: String(cambios.dias ?? dias) })
    const u = cambios.usuario ?? elegido
    if (u) p.set('usuario', u)
    return `/admin/actividad?${p}`
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo">Actividad</h1>
          <p className="text-sm text-neutral-500">Quién entró a la app y qué solapas consultó. Abrir varias veces la misma solapa en 10 minutos cuenta como una sola consulta.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-neutral-300 bg-white p-0.5 text-sm">
            {PERIODOS.map((p) => (
              <Link key={p.dias} href={enlace({ dias: p.dias })}
                className={`rounded-full px-3 py-1 ${p.dias === dias ? 'bg-marca text-white' : 'text-neutral-600 hover:text-black'}`}>{p.texto}</Link>
            ))}
          </div>
          {elegido && <Link href={enlace({ usuario: '' })} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm">
            {nombre(elegido)} <span className="text-neutral-400">✕</span></Link>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { t: 'Usuarios activos', v: porUsuario.length },
          { t: 'Consultas', v: vistas.length },
          { t: 'Inicios de sesión', v: eventos.filter((e) => e.tipo === 'ingreso').length },
          { t: 'Solapa más vista', v: porSolapa[0] ? nombreSolapa(porSolapa[0].s) : '—' },
        ].map((x) => (
          <div key={x.t} className={tarjeta}>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{x.t}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{x.v}</div>
          </div>
        ))}
      </div>

      {eventos.length === 0 ? (
        <section className={tarjeta}><p className="text-sm text-neutral-500">No hay actividad registrada en este período.</p></section>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <section className={`${tarjeta} overflow-x-auto`}>
              <h2 className="mb-3 text-base font-bold">Por usuario</h2>
              <table className="w-full text-sm">
                <thead className="border-b-2 border-marca text-left text-[11px] uppercase tracking-wide text-neutral-500">
                  <tr><th className="py-2 pr-3">Usuario</th><th className="pr-3">Última actividad</th><th className="pr-3 text-right">Días</th><th className="pr-3 text-right">Consultas</th><th>Lo que más mira</th></tr>
                </thead>
                <tbody>
                  {porUsuario.map((x) => (
                    <tr key={x.u} className="border-b border-neutral-100 align-top">
                      <td className="py-2 pr-3"><Link href={enlace({ usuario: x.u })} className="font-medium underline decoration-neutral-300 hover:decoration-marca">{nombre(x.u)}</Link>
                        <div className="text-xs text-neutral-400">{x.u}</div></td>
                      <td className="whitespace-nowrap py-2 pr-3">{fechaHora(x.ultima)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{x.dias}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{x.vistas}</td>
                      <td className="py-2 text-neutral-600">{x.top.map((t) => `${nombreSolapa(t.s)} (${t.n})`).join(' · ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={tarjeta}>
              <h2 className="mb-3 text-base font-bold">Por solapa</h2>
              {porSolapa.length === 0 ? <p className="text-sm text-neutral-500">Sin consultas.</p> : (
                <ul className="space-y-2 text-sm">
                  {porSolapa.map((x) => (
                    <li key={x.s}>
                      <div className="flex justify-between gap-2"><span>{nombreSolapa(x.s)}</span>
                        <span className="tabular-nums text-neutral-500">{x.n} · {x.usuarios} {x.usuarios === 1 ? 'usuario' : 'usuarios'}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-neutral-100"><div className="h-2 rounded-full bg-marca" style={{ width: `${(100 * x.n) / maxSolapa}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className={`${tarjeta} overflow-x-auto`}>
            <h2 className="mb-3 text-base font-bold">Últimos movimientos</h2>
            <table className="w-full text-sm">
              <thead className="border-b-2 border-marca text-left text-[11px] uppercase tracking-wide text-neutral-500">
                <tr><th className="py-2 pr-3">Fecha y hora</th><th className="pr-3">Usuario</th><th>Qué hizo</th></tr>
              </thead>
              <tbody>
                {eventos.slice(0, 150).map((e, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums text-neutral-500">{fechaHora(e.t)}</td>
                    <td className="py-1.5 pr-3">{nombre(e.u)}</td>
                    <td className="py-1.5">{e.tipo === 'ingreso' ? <span className="font-medium text-emerald-700">Inició sesión</span> : <>Consultó <b>{nombreSolapa(e.s)}</b></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {eventos.length > 150 && <p className="mt-2 text-xs text-neutral-500">Se muestran los últimos 150 movimientos de {eventos.length}.</p>}
          </section>
        </>
      )}
    </div>
  )
}

function ranking(vistas: Evento[]) {
  const n = new Map<string, number>()
  for (const e of vistas) n.set(e.s ?? '', (n.get(e.s ?? '') ?? 0) + 1)
  return [...n].map(([s, c]) => ({ s, n: c })).sort((a, b) => b.n - a.n)
}
