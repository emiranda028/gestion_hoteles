import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseCsv } from '../../csv'
import { DATA } from '../../datos'
import { escribir, leer, registrar } from '../almacen'
import { anioVacio, type Anio, type Codigo } from './modelo'

// gestion/forecast/<hotel>/estructura.json y <año>.json
export const estructura = (hotel: string) => leer<Codigo[]>(['forecast', hotel, 'estructura.json'], [])
export const guardarEstructura = (hotel: string, e: Codigo[]) => escribir(['forecast', hotel, 'estructura.json'], e)

export const anio = (hotel: string, a: number, habitaciones: number) => leer<Anio>(['forecast', hotel, `${a}.json`], anioVacio(a, habitaciones))
export const existe = (hotel: string, a: number) => leer<Anio | null>(['forecast', hotel, `${a}.json`], null) !== null

export function guardarAnio(hotel: string, a: Anio, usuario: string, accion: string, detalle?: string) {
  escribir(['forecast', hotel, `${a.anio}.json`], a)
  registrar('forecast', hotel, usuario, accion, detalle ? `${a.anio} · ${detalle}` : String(a.anio))
}

/** Promedio mensual del dólar BNA vendedor (la misma serie que usa el resto de la plataforma). */
export function tcMensual(): Record<string, number> {
  const r = path.join(/*turbopackIgnore: true*/ DATA, 'tipo_cambio.csv')
  const archivo = existsSync(r) ? r : path.join(process.cwd(), 'data', 'demo', 'tipo_cambio.csv')
  if (!existsSync(archivo)) return {}
  const suma = new Map<string, [number, number]>()
  for (const f of parseCsv(readFileSync(archivo, 'utf-8'))) {
    const v = Number(f.ars_por_usd), mes = f.fecha?.slice(0, 7)
    if (!mes || !v) continue
    const x = suma.get(mes) ?? [0, 0]
    suma.set(mes, [x[0] + v, x[1] + 1])
  }
  return Object.fromEntries([...suma].map(([m, [s, n]]) => [m, Math.round((s / n) * 100) / 100]))
}
