// Antigüedad y previsión de cobro, factura por factura. Funciones puras (se prueban sin servidor).
import type { Factura } from './modelo.ts'

export const TRAMOS = [
  { k: 'avencer', t: 'A vencer', desde: -Infinity, hasta: 0 },
  { k: 'd30', t: '1 a 30 días', desde: 1, hasta: 30 },
  { k: 'd60', t: '31 a 60 días', desde: 31, hasta: 60 },
  { k: 'd90', t: '61 a 90 días', desde: 61, hasta: 90 },
  { k: 'd120', t: '91 a 120 días', desde: 91, hasta: 120 },
  { k: 'dmas', t: 'Más de 120 días', desde: 121, hasta: Infinity },
] as const
export type Tramo = (typeof TRAMOS)[number]['k']

const DIA = 864e5
const ms = (f: string) => Date.parse(f + 'T12:00:00Z')
export const sumarDias = (f: string, n: number) => new Date(ms(f) + n * DIA).toISOString().slice(0, 10)
export const diasEntre = (desde: string, hasta: string) => Math.round((ms(hasta) - ms(desde)) / DIA)

/** Días de atraso al corte (negativo o cero = todavía no venció). */
export const diasVencida = (f: Factura, corte: string) => diasEntre(f.vence, corte)

export function tramo(f: Factura, corte: string): Tramo {
  const d = diasVencida(f, corte)
  return TRAMOS.find((t) => d >= t.desde && d <= t.hasta)!.k
}

export type Antiguedad = Record<Tramo, number> & { total: number; vencido: number; mas90: number; facturas: number; maxAtraso: number }

export function antiguedad(facturas: Factura[], corte: string): Antiguedad {
  const r = { avencer: 0, d30: 0, d60: 0, d90: 0, d120: 0, dmas: 0, total: 0, vencido: 0, mas90: 0, facturas: 0, maxAtraso: 0 }
  for (const f of facturas) {
    const t = tramo(f, corte)
    r[t] += f.saldo
    r.total += f.saldo
    if (t !== 'avencer') r.vencido += f.saldo
    if (t === 'd120' || t === 'dmas') r.mas90 += f.saldo
    r.facturas++
    if (f.saldo > 0) r.maxAtraso = Math.max(r.maxAtraso, diasVencida(f, corte))
  }
  return r
}

/** Las 5 semanas de previsión: de 7 días cada una, a partir del día siguiente al corte. */
export function semanas(corte: string) {
  return Array.from({ length: 5 }, (_, i) => ({ desde: sumarDias(corte, 1 + i * 7), hasta: sumarDias(corte, 7 + i * 7) }))
}

export type Destino = 'sinFecha' | 'atrasada' | 0 | 1 | 2 | 3 | 4 | 'despues'

/**
 * A qué columna de la previsión va cada factura:
 * - con fecha prevista cargada: esa fecha (si ya pasó y no se cobró, queda como "promesa vencida");
 * - sin fecha cargada y todavía no vencida: su vencimiento;
 * - vencida y sin fecha: "sin fecha de cobro", para que alguien la gestione (no se inventa una semana).
 */
export function destino(f: Factura, corte: string, prevista?: string): Destino {
  const fecha = prevista || (diasVencida(f, corte) <= 0 ? f.vence : null)
  if (!fecha) return 'sinFecha'
  const d = diasEntre(corte, fecha)
  if (d < 1) return prevista ? 'atrasada' : 'sinFecha'
  if (d > 35) return 'despues'
  return Math.floor((d - 1) / 7) as 0 | 1 | 2 | 3 | 4
}

export type Prevision = { semanas: number[]; despues: number; sinFecha: number; atrasada: number; total: number }

export function prevision(facturas: Factura[], corte: string, previstas: Record<string, string>): Prevision {
  const r: Prevision = { semanas: [0, 0, 0, 0, 0], despues: 0, sinFecha: 0, atrasada: 0, total: 0 }
  for (const f of facturas) {
    const d = destino(f, corte, previstas[f.id])
    if (typeof d === 'number') r.semanas[d] += f.saldo
    else r[d] += f.saldo
    r.total += f.saldo
  }
  return r
}

export const comprobante = (f: Factura) => `${f.letra} ${String(f.prefijo).padStart(4, '0')}-${String(f.numero).padStart(8, '0')}`
