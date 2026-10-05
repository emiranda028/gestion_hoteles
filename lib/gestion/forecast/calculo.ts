// Reglas del forecast y KPIs, iguales para todas las pantallas. Funciones puras.
import type { Anio, Capa, Celda, Codigo } from './modelo.ts'
import { clave } from './modelo.ts'

export const diasMes = (anio: number, m: number) => new Date(Date.UTC(anio, m + 1, 0)).getUTCDate() // contempla bisiestos

/** Meses cerrados: los que ya tienen Real cargado en algún código. */
export function mesesConReal(a: Anio | undefined): boolean[] {
  const r = Array(12).fill(false)
  if (!a) return r
  for (const v of Object.values(a.real)) v.forEach((c, m) => { if (c) r[m] = true })
  return r
}

export type Escenario = 'budget' | 'real' | 'forecast' | 'anterior'

const cache = new WeakMap<Anio, boolean[]>()
const cerradosDe = (a: Anio) => {
  let c = cache.get(a)
  if (!c) cache.set(a, (c = mesesConReal(a)))
  return c
}

/**
 * Valor de un código en un mes según el escenario.
 * Forecast: en los meses cerrados manda el Real (los códigos sin venta valen 0);
 * en los abiertos, la proyección cargada o, si no hay, el Budget.
 */
export function celda(esc: Escenario, k: string, m: number, a: Anio | undefined, previo: Anio | undefined, cerrados: boolean[]): Celda {
  const cero: Celda = [0, 0]
  if (esc === 'anterior') {
    // año anterior: su Real en los meses cerrados y su forecast en los que todavía no cerraron
    if (!previo) return cero
    const c = cerradosDe(previo)
    return c[m] ? previo.real[k]?.[m] ?? cero : previo.forecast[k]?.[m] ?? previo.budget[k]?.[m] ?? cero
  }
  if (!a) return cero
  if (esc === 'budget') return a.budget[k]?.[m] ?? cero
  if (esc === 'real') return a.real[k]?.[m] ?? cero
  if (cerrados[m]) return a.real[k]?.[m] ?? cero
  return a.forecast[k]?.[m] ?? a.budget[k]?.[m] ?? cero
}

export type Totales = { rn: number; rev: number; disp: number; revArs: number }
export const sinDatos = (t: Totales) => t.rn === 0 && t.rev === 0

export function sumar(cods: string[], meses: number[], esc: Escenario, a: Anio | undefined, previo: Anio | undefined,
  cerrados: boolean[], tc: (esc: Escenario, m: number) => number | null): Totales {
  const t: Totales = { rn: 0, rev: 0, disp: 0, revArs: 0 }
  const base = esc === 'anterior' ? previo : a
  for (const m of meses) {
    let rnM = 0, revM = 0
    for (const k of cods) {
      const [rn, adr] = celda(esc, k, m, a, previo, cerrados)
      rnM += rn
      revM += rn * adr
    }
    t.rn += rnM
    t.rev += revM
    t.revArs += revM * (tc(esc, m) ?? 0)
    if (base) t.disp += (base.inventario[m] ?? 0) * diasMes(base.anio, m)
  }
  return t
}

/** KPIs: el ADR siempre ponderado (ingresos / noches), nunca un promedio de ADRs. */
export function kpis(t: Totales, moneda: 'USD' | 'ARS' = 'USD') {
  const rev = moneda === 'ARS' ? t.revArs : t.rev
  return {
    rn: t.rn, revenue: rev,
    adr: t.rn ? rev / t.rn : 0,
    ocupacion: t.disp ? t.rn / t.disp : 0,
    revpar: t.disp ? rev / t.disp : 0,
  }
}

export const variacion = (actual: number, base: number) => (base ? (actual - base) / Math.abs(base) : null)

/**
 * Reparte un total de noches entre códigos en proporción a sus pesos, en enteros que suman exactamente el total
 * (método del mayor resto). Se usa para llevar el total de un mes (OTB + pickup) a cada código.
 */
export function repartirEnteros(total: number, pesos: number[]): number[] {
  const suma = pesos.reduce((s, x) => s + Math.max(0, x), 0)
  const base = suma > 0 ? pesos.map((p) => Math.max(0, p) / suma) : pesos.map(() => 1 / pesos.length)
  const exactos = base.map((b) => b * total)
  const r = exactos.map(Math.floor)
  let falta = Math.round(total) - r.reduce((s, x) => s + x, 0)
  const orden = exactos.map((x, i) => [x - Math.floor(x), i] as const).sort((x, y) => y[0] - x[0])
  for (let i = 0; falta > 0 && i < orden.length; i++, falta--) r[orden[i][1]]++
  return r
}

/**
 * Proyección de un mes a partir del total (noches y ADR del mes): reparte las noches según la mezcla de referencia
 * y escala los ADR de referencia para que el ingreso total cierre exacto con noches × ADR.
 */
export function proyectarMes(cods: string[], referencia: (k: string) => Celda, rnTotal: number, adrTotal: number): Record<string, Celda> {
  const hayMezcla = cods.some((k) => referencia(k)[0] > 0)
  const rns = repartirEnteros(rnTotal, cods.map((k) => referencia(k)[0]))
  // la tarifa de referencia se respeta aunque sea 0 (cortesías); sin referencia, el ADR del total
  const adrRef = (k: string) => (hayMezcla ? referencia(k)[1] : adrTotal)
  const revRef = cods.reduce((s, k, i) => s + rns[i] * adrRef(k), 0)
  const factor = revRef ? (rnTotal * adrTotal) / revRef : 1
  return Object.fromEntries(cods.map((k, i) => [k, [rns[i], Math.round(adrRef(k) * factor * 100) / 100] as Celda]))
}

/** Budget de un año a partir de una base (forecast o real del año anterior) con ajustes de noches y tarifa. */
export function proyectarAnio(cods: string[], base: (k: string, m: number) => Celda, ajusteRn: number, ajusteAdr: number): Capa {
  return Object.fromEntries(cods.map((k) => [k, Array.from({ length: 12 }, (_, m) => {
    const [rn, adr] = base(k, m)
    return [Math.round(rn * (1 + ajusteRn)), Math.round(adr * (1 + ajusteAdr) * 100) / 100] as Celda
  })]))
}

/** Agrupa los códigos de la estructura en Category › Segment. */
export function arbol(estructura: Codigo[]) {
  const cats = new Map<string, Map<string, Codigo[]>>()
  for (const c of estructura) {
    if (!cats.has(c.cat)) cats.set(c.cat, new Map())
    const segs = cats.get(c.cat)!
    segs.set(c.seg, [...(segs.get(c.seg) ?? []), c])
  }
  return [...cats].map(([cat, segs]) => ({
    cat, claves: [...segs.values()].flat().map(clave),
    segmentos: [...segs].map(([seg, cods]) => ({ seg, claves: cods.map(clave), codigos: cods })),
  }))
}
