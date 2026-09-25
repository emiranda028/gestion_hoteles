// Cálculo de indicadores hoteleros. Funciones puras: se usan en servidor y cliente.

export type Dia = {
  f: string // fecha ISO
  h: string // hotel_id
  disp: number
  ocup: number
  pax: number
  ingHab: number
  ingAyb: number
  ingOtros: number
  ingTot: number
  tc: number | null // moneda local por USD en esa fecha
}

export type Moneda = 'local' | 'usd'

export type Agregado = {
  dias: number
  disp: number
  ocup: number
  pax: number
  ingHab: number
  ingAyb: number
  ingOtros: number
  ingTot: number
  occ: number // %
  adr: number
  revpar: number
  trevpar: number
}

const CAMPOS_DINERO = ['ingHab', 'ingAyb', 'ingOtros', 'ingTot'] as const

export function convertir(d: Dia, moneda: Moneda): Dia {
  if (moneda === 'local' || !d.tc) return d
  const r = { ...d }
  for (const c of CAMPOS_DINERO) r[c] = d[c] / d.tc
  return r
}

export function agregar(dias: Dia[], moneda: Moneda = 'local'): Agregado {
  const a = { dias: 0, disp: 0, ocup: 0, pax: 0, ingHab: 0, ingAyb: 0, ingOtros: 0, ingTot: 0 }
  const fechas = new Set<string>()
  for (const crudo of dias) {
    const d = convertir(crudo, moneda)
    fechas.add(d.f)
    a.disp += d.disp
    a.ocup += d.ocup
    a.pax += d.pax
    a.ingHab += d.ingHab
    a.ingAyb += d.ingAyb
    a.ingOtros += d.ingOtros
    a.ingTot += d.ingTot
  }
  a.dias = fechas.size
  return {
    ...a,
    occ: a.disp ? (100 * a.ocup) / a.disp : 0,
    adr: a.ocup ? a.ingHab / a.ocup : 0,
    revpar: a.disp ? a.ingHab / a.disp : 0,
    trevpar: a.disp ? a.ingTot / a.disp : 0,
  }
}

export function agrupar<K extends string>(dias: Dia[], clave: (d: Dia) => K): Map<K, Dia[]> {
  const m = new Map<K, Dia[]>()
  for (const d of dias) {
    const k = clave(d)
    const lista = m.get(k)
    if (lista) lista.push(d)
    else m.set(k, [d])
  }
  return m
}

export const mesDe = (f: string) => f.slice(0, 7)

export function serie(dias: Dia[], moneda: Moneda, clave: (d: Dia) => string) {
  return [...agrupar(dias, clave).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, ds]) => ({ clave: k, ...agregar(ds, moneda) }))
}

export function filtrar(dias: Dia[], desde: string, hasta: string, hoteles?: Set<string>) {
  return dias.filter((d) => d.f >= desde && d.f <= hasta && (!hoteles || hoteles.has(d.h)))
}

/** Misma ventana un año antes (ajusta 29/02). */
export function anioAnterior(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dd = m === 2 && d === 29 ? 28 : d
  return `${y - 1}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null
  return (actual - anterior) / Math.abs(anterior)
}

export function sumarDias(fecha: string, n: number): string {
  const d = new Date(fecha + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function diasDelMes(mes: string): number {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function sumarMeses(mes: string, n: number): string {
  const [y, m] = mes.split('-').map(Number)
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}
