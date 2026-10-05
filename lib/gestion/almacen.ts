import 'server-only'
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { DATA } from '../datos'

// Datos de los módulos de Gestión (Forecast, Cobranzas, Calidad): JSON en el servidor, uno por hotel y tema.
// Una sola fuente de verdad para todos los usuarios, con registro de quién cambió qué.

export const CARPETA = path.join(DATA, 'gestion')
const ruta = (...partes: string[]) => path.join(/*turbopackIgnore: true*/ CARPETA, ...partes)

export function leer<T>(partes: string[], defecto: T): T {
  const r = ruta(...partes)
  if (!existsSync(r)) return defecto
  try {
    return JSON.parse(readFileSync(r, 'utf-8')) as T
  } catch {
    return defecto
  }
}

export function escribir(partes: string[], valor: unknown) {
  const r = ruta(...partes)
  mkdirSync(path.dirname(r), { recursive: true })
  const tmp = `${r}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(valor), { mode: 0o600 })
  renameSync(tmp, r)
}

export function rutaArchivo(...partes: string[]) {
  return ruta(...partes)
}

export type Cambio = { fecha: string; usuario: string; accion: string; detalle?: string }

/** Agrega una línea al registro de cambios del módulo y hotel. */
export function registrar(modulo: string, hotel: string, usuario: string, accion: string, detalle?: string) {
  const r = ruta(modulo, hotel, 'registro.jsonl')
  mkdirSync(path.dirname(r), { recursive: true })
  const linea: Cambio = { fecha: new Date().toISOString(), usuario, accion, ...(detalle ? { detalle } : {}) }
  appendFileSync(r, JSON.stringify(linea) + '\n', { mode: 0o600 })
}

export function registro(modulo: string, hotel: string, ultimos = 200): Cambio[] {
  const r = ruta(modulo, hotel, 'registro.jsonl')
  if (!existsSync(r)) return []
  const lineas = readFileSync(r, 'utf-8').trim().split('\n').filter(Boolean)
  return lineas.slice(-ultimos).reverse().map((l) => JSON.parse(l) as Cambio)
}

/** Identificador corto para registros nuevos. */
export function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
