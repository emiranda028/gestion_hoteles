import Link from 'next/link'
import { notFound } from 'next/navigation'
import BotonImprimir from '@/components/gestion/BotonImprimir'
import { accesoGestion } from '@/lib/acceso'
import { itemsDe } from '@/lib/gestion/calidad/calculo'
import type { Item, Nodo } from '@/lib/gestion/calidad/modelo'
import { programa } from '@/lib/gestion/calidad/programas'

export const metadata = { title: 'Manual · Calidad · Gestión Hotelera' }

function porCategoria(items: Item[]) {
  const m = new Map<string, Item[]>()
  for (const it of items) m.set(it.cat ?? '', [...(m.get(it.cat ?? '') ?? []), it])
  return [...m]
}

function Norma({ n }: { n: Nodo }) {
  const x = n.norma
  if (!x) return null
  return (
    <div className="space-y-2 text-sm text-neutral-700">
      {x.objetivo && <p><strong>Objetivo.</strong> {x.objetivo}</p>}
      {x.procedimiento && <p><strong>Procedimiento.</strong> {x.procedimiento}</p>}
      {x.focus?.length ? <div><strong>Focos de atención</strong><ul className="ml-5 list-disc">{x.focus.map((f, i) => <li key={i}>{f}</li>)}</ul></div> : null}
      {(x.responsable || x.frecuencia) && (
        <table className="text-xs"><tbody>
          {[['Responsable', x.responsable], ['Supervisión', x.supervision], ['Tipo de control', x.tipo_control], ['Frecuencia', x.frecuencia]]
            .filter(([, v]) => v).map(([k, v]) => <tr key={k}><td className="pr-3 font-semibold">{k}</td><td>{v}</td></tr>)}
        </tbody></table>
      )}
    </div>
  )
}

export default async function Page({ params, searchParams }: { params: Promise<{ programa: string }>; searchParams: Promise<{ nodo?: string }> }) {
  await accesoGestion('/calidad')
  const { programa: id } = await params
  const { nodo } = await searchParams
  const prog = programa(id)
  if (!prog) notFound()
  const nodos = nodo ? prog.nodos.filter((n) => n.c === nodo) : prog.nodos
  const total = prog.nodos.flatMap(itemsDe).length

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <div className="no-imprimir flex flex-wrap items-center justify-between gap-2">
        <Link href="/calidad" className="text-sm text-neutral-500 hover:text-neutral-900">← Calidad</Link>
        <div className="flex gap-2">
          {nodo && <Link href={`/calidad/manual/${prog.id}`} className="rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm">Ver manual completo</Link>}
          <BotonImprimir />
        </div>
      </div>
      <header className="border-b-4 border-acento pb-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-acento">Manual</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{prog.nombre}</h1>
        <p className="mt-1 text-neutral-600">{prog.descripcion}</p>
        <p className="mt-1 text-xs text-neutral-500">{prog.nodos.length} {prog.id === 'estandares' ? 'puntos de contacto' : 'áreas'} · {total.toLocaleString('es-AR')} {prog.id === 'estandares' ? 'estándares' : 'preguntas'}</p>
      </header>

      {!nodo && (
        <nav className="no-imprimir tarjeta rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <div className="mb-2 text-sm font-semibold">Índice</div>
          <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {prog.nodos.map((n) => (
              <div key={n.c} className="flex items-center justify-between gap-2">
                <a href={`#${n.c}`} className="truncate hover:text-acento">{n.icono} {n.n}</a>
                <Link href={`/calidad/manual/${prog.id}?nodo=${n.c}`} className="shrink-0 text-xs text-neutral-500 underline">solo esta</Link>
              </div>
            ))}
          </div>
        </nav>
      )}

      {nodos.map((n) => (
        <section key={n.c} id={n.c} className="tarjeta break-before-page space-y-4 rounded-xl bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{n.c}{n.peso ? ` · peso ${n.peso}` : ''}{n.opcional ? ' · opcional' : ''}</div>
            <h2 className="text-2xl font-bold">{n.icono} {n.n}{n.en && <span className="ml-2 text-base font-normal text-neutral-400">{n.en}</span>}</h2>
            {n.norma?.subtitulo && <p className="text-neutral-600">{n.norma.subtitulo}</p>}
            {n.norma?.introduccion && <p className="mt-2 text-sm text-neutral-700">{n.norma.introduccion}</p>}
          </div>
          {n.hijos?.map((h) => (
            <div key={h.c} className="space-y-2 border-t border-neutral-200 pt-4">
              <h3 className="text-lg font-bold">{h.c} · {h.n}</h3>
              <Norma n={h} />
              <ol className="space-y-1 text-sm">
                {(h.items ?? []).map((it) => <li key={it.c} className="flex gap-3"><span className="w-14 shrink-0 font-mono text-xs text-neutral-400">{it.c}</span><span>{it.t}</span></li>)}
              </ol>
              {h.accion && <p className="rounded bg-neutral-50 px-3 py-2 text-xs"><strong>Acción sugerida si no se cumple:</strong> {h.accion}</p>}
            </div>
          ))}
          {n.items && porCategoria(n.items).map(([cat, items]) => (
            <div key={cat} className="space-y-1">
              {cat && <h3 className="border-b border-neutral-200 pb-1 text-sm font-semibold uppercase tracking-wide text-neutral-600">{cat}</h3>}
              <ol className="space-y-1 text-sm">
                {items.map((it) => (
                  <li key={it.c} className="flex gap-3">
                    <span className="w-20 shrink-0 font-mono text-xs text-neutral-400">{it.c}</span>
                    <span className="flex-1">{it.t}</span>
                    <span className="shrink-0 text-xs text-neutral-400">peso {it.p}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      ))}
    </article>
  )
}
