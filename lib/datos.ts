import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseCsv } from './csv.ts'
import type { Dia } from './kpi.ts'

export type Hotel = { id: string; nombre: string }
export type Procedencia = { mes: string; h: string; iso2: string; pais: string; pax: number }
export type EstadoIngesta = {
  ejecutado: string
  archivos: { origen: string; hotel: string | null; fecha: string | null; ok: boolean; avisos: string[] }[]
} | null

export type Datos = {
  demo: boolean
  monedaLocal: string
  hayTipoCambio: boolean
  hoteles: Hotel[]
  dias: Dia[]
  procedencia: Procedencia[]
  desde: string
  hasta: string
  ingesta: EstadoIngesta
}

const DATA = path.join(process.cwd(), 'data')

function leer(nombre: string, carpeta = DATA): Record<string, string>[] {
  const ruta = path.join(carpeta, nombre)
  return existsSync(ruta) ? parseCsv(readFileSync(ruta, 'utf-8')) : []
}

const num = (v: string | undefined) => {
  const n = Number(v)
  return v === undefined || v === '' || Number.isNaN(n) ? 0 : n
}

let cache: Datos | null = null

export function cargarDatos(): Datos {
  if (cache && process.env.NODE_ENV === 'production') return cache
  let carpeta = DATA
  let filas = leer('diario.csv')
  const demo = filas.length === 0
  if (demo) {
    carpeta = path.join(DATA, 'demo')
    filas = leer('diario.csv', carpeta)
  }

  // Tipo de cambio: se completa hacia adelante para días sin cotización (fines de semana).
  const tcFilas = leer('tipo_cambio.csv', carpeta).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const tcFechas = tcFilas.map((r) => r.fecha)
  const tcValores = tcFilas.map((r) => num(r.ars_por_usd))
  const tcPara = (f: string): number | null => {
    let lo = 0, hi = tcFechas.length - 1, res = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (tcFechas[mid] <= f) { res = mid; lo = mid + 1 } else hi = mid - 1
    }
    return res >= 0 ? tcValores[res] : tcValores[0] ?? null
  }

  const hoteles = new Map<string, string>()
  const dias: Dia[] = filas
    .filter((r) => r.fecha && r.hotel_id)
    .map((r) => {
      hoteles.set(r.hotel_id, r.hotel || r.hotel_id)
      const ingHab = num(r.ingreso_habitaciones)
      const ingAyb = num(r.ingreso_ayb)
      const ingOtros = num(r.ingreso_otros)
      return {
        f: r.fecha,
        h: r.hotel_id,
        disp: num(r.habitaciones_disponibles),
        ocup: num(r.habitaciones_ocupadas),
        pax: num(r.huespedes),
        ingHab,
        ingAyb,
        ingOtros,
        ingTot: num(r.ingreso_total) || ingHab + ingAyb + ingOtros,
        tc: tcPara(r.fecha),
      }
    })
    .sort((a, b) => a.f.localeCompare(b.f) || a.h.localeCompare(b.h))

  // La procedencia se agrega por mes para no mandar miles de filas al navegador.
  const proc = new Map<string, Procedencia>()
  for (const r of leer('procedencia.csv', carpeta)) {
    const mes = r.fecha.slice(0, 7)
    const k = `${mes}|${r.hotel_id}|${r.iso2 || r.pais}`
    const p = proc.get(k)
    if (p) p.pax += num(r.huespedes)
    else proc.set(k, { mes, h: r.hotel_id, iso2: r.iso2, pais: r.pais, pax: num(r.huespedes) })
  }

  const rutaEstado = path.join(DATA, 'ultima_ingesta.json')
  cache = {
    demo,
    monedaLocal: process.env.MONEDA_LOCAL || 'ARS',
    hayTipoCambio: tcFilas.length > 0,
    hoteles: [...hoteles].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    dias,
    procedencia: [...proc.values()],
    desde: dias[0]?.f ?? '',
    hasta: dias[dias.length - 1]?.f ?? '',
    ingesta: existsSync(rutaEstado) ? JSON.parse(readFileSync(rutaEstado, 'utf-8')) : null,
  }
  return cache
}
