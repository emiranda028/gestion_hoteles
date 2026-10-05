// Cálculo único de cumplimiento para cualquier programa de Calidad.
// Regla: cumplimiento = Σ(puntaje × peso) / Σ peso, solo sobre los ítems respondidos y que aplican.
// La cobertura (cuánto se evaluó) se informa aparte: así nunca se ve "100%" con 1 ítem evaluado de 200.
import { OBJETIVO, type Item, type Nodo, type Programa, type Respuesta } from './modelo.ts'

export type Resumen = {
  cumplimiento: number | null // 0 a 1; null si no hay nada evaluado
  cobertura: number // 0 a 1: respondidos / aplicables
  respondidos: number
  aplicables: number // total menos los "no aplica"
  total: number
  noCumple: number // ítems con puntaje menor a 50%
}

/** Puntaje del ítem entre 0 y 1, o null si no se respondió o no aplica. */
export function puntajeItem(prog: Programa, item: Item, r: Respuesta | undefined): number | null {
  if (!r || r.na || !r.o) return null
  const escala = prog.escalas[item.e ?? 0] ?? []
  if (item.m) return Math.min(1, r.o.reduce((s, i) => s + (escala[i]?.v ?? 0), 0) / 100)
  if (r.o.length === 0) return null
  return (escala[r.o[0]]?.v ?? 0) / 100
}

export function itemsDe(nodo: Nodo): Item[] {
  return [...(nodo.items ?? []), ...(nodo.hijos ?? []).flatMap(itemsDe)]
}

export function resumirItems(prog: Programa, items: Item[], resp: Record<string, Respuesta>): Resumen {
  let num = 0, den = 0, respondidos = 0, aplicables = 0, noCumple = 0
  for (const it of items) {
    const r = resp[it.c]
    if (r?.na) continue
    aplicables++
    const p = puntajeItem(prog, it, r)
    if (p === null) continue
    respondidos++
    num += p * it.p
    den += it.p
    if (p < 0.5) noCumple++
  }
  return {
    cumplimiento: den > 0 ? num / den : null,
    cobertura: aplicables ? respondidos / aplicables : 0,
    respondidos, aplicables, total: items.length, noCumple,
  }
}

export const resumirNodo = (prog: Programa, nodo: Nodo, resp: Record<string, Respuesta>) =>
  resumirItems(prog, itemsDe(nodo), resp)

export const resumirPrograma = (prog: Programa, resp: Record<string, Respuesta>) =>
  resumirItems(prog, prog.nodos.flatMap(itemsDe), resp)

/** Un solo semáforo para todos los programas. */
export function semaforo(c: number | null): { texto: string; color: string; fondo: string } {
  if (c === null) return { texto: 'Sin evaluar', color: '#737373', fondo: '#f4f4f4' }
  if (c >= OBJETIVO) return { texto: 'Excelente', color: '#15803d', fondo: '#dcfce7' }
  if (c >= 0.7) return { texto: 'Bueno', color: '#4d7c0f', fondo: '#ecfccb' }
  if (c >= 0.5) return { texto: 'Aceptable', color: '#b45309', fondo: '#fef3c7' }
  return { texto: 'Crítico', color: '#b5121b', fondo: '#fee2e2' }
}

export function prioridad(c: number | null): 'Alta' | 'Media' | 'Baja' | null {
  if (c === null || c >= OBJETIVO) return null
  if (c < 0.5) return 'Alta'
  if (c < 0.7) return 'Media'
  return 'Baja'
}

/** Nodos que se usan para el plan de acción: las hojas que tienen ítems (subsecciones o puntos de contacto). */
export function nodosPlan(prog: Programa): { nodo: Nodo; padre?: Nodo }[] {
  const salida: { nodo: Nodo; padre?: Nodo }[] = []
  for (const n of prog.nodos) {
    if (n.hijos?.length) for (const h of n.hijos) salida.push({ nodo: h, padre: n })
    else salida.push({ nodo: n })
  }
  return salida
}

/** Cumplimiento por categoría transversal (Limpieza, Saludos…), para los estándares de servicio. */
export function porCategoria(prog: Programa, resp: Record<string, Respuesta>) {
  const grupos = new Map<string, Item[]>()
  for (const it of prog.nodos.flatMap(itemsDe)) {
    if (!it.cat) continue
    const l = grupos.get(it.cat)
    if (l) l.push(it)
    else grupos.set(it.cat, [it])
  }
  return [...grupos].map(([cat, items]) => ({ cat, ...resumirItems(prog, items, resp) }))
}

/** Acciones abiertas: secciones bajo el objetivo (o con acción cargada) que no están hechas ni descartadas. */
export function accionesAbiertas(prog: Programa, respuestas: Record<string, Respuesta>, plan: Record<string, { estado: string }>) {
  return nodosPlan(prog).filter(({ nodo }) => {
    const est = plan[nodo.c]?.estado
    if (est === 'hecha' || est === 'no_aplica') return false
    return !!est || prioridad(resumirItems(prog, itemsDe(nodo), respuestas).cumplimiento) !== null
  }).length
}
