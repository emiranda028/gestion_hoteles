import 'server-only'
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { DATA } from './datos'

// Actividad de los usuarios: inicios de sesión y solapas que abren.
// Un archivo por mes en DATA_DIR/actividad/AAAA-MM.jsonl (una línea por evento).

export type Evento = { t: string; u: string; tipo: 'ingreso' | 'vista'; s?: string }

const carpeta = () => path.join(/*turbopackIgnore: true*/ DATA, 'actividad')
const archivo = (mes: string) => path.join(/*turbopackIgnore: true*/ carpeta(), `${mes}.jsonl`)

// la misma solapa abierta varias veces seguidas cuenta una sola vez cada 10 minutos
const REPETIDA_MS = 10 * 60e3
const ultimas = new Map<string, number>()

function anotar(e: Evento) {
  try {
    mkdirSync(carpeta(), { recursive: true })
    appendFileSync(archivo(e.t.slice(0, 7)), JSON.stringify(e) + '\n', { mode: 0o600 })
  } catch {
    // la actividad nunca debe impedir ver la app
  }
}

export function registrarIngreso(usuario: string) {
  anotar({ t: new Date().toISOString(), u: usuario, tipo: 'ingreso' })
}

export function registrarVista(usuario: string, seccion: string) {
  const clave = `${usuario}|${seccion}`, ahora = Date.now()
  if (ahora - (ultimas.get(clave) ?? 0) < REPETIDA_MS) return
  ultimas.set(clave, ahora)
  anotar({ t: new Date(ahora).toISOString(), u: usuario, tipo: 'vista', s: seccion })
}

/** Eventos desde hace `dias` días, del más nuevo al más viejo. */
export function leerActividad(dias: number): Evento[] {
  const desde = new Date(Date.now() - dias * 864e5)
  const meses: string[] = []
  for (let d = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), 1)); d <= new Date(); d.setUTCMonth(d.getUTCMonth() + 1)) {
    meses.push(d.toISOString().slice(0, 7))
  }
  const limite = desde.toISOString()
  const eventos: Evento[] = []
  for (const m of meses) {
    if (!existsSync(archivo(m))) continue
    for (const linea of readFileSync(archivo(m), 'utf-8').split('\n')) {
      if (!linea) continue
      try {
        const e = JSON.parse(linea) as Evento
        if (e.t >= limite) eventos.push(e)
      } catch {
        // línea incompleta: se ignora
      }
    }
  }
  return eventos.sort((a, b) => b.t.localeCompare(a.t))
}

/** Último evento de cada usuario en los últimos 90 días. */
export function ultimaActividad(): Map<string, string> {
  const r = new Map<string, string>()
  for (const e of leerActividad(90)) if (!r.has(e.u)) r.set(e.u, e.t)
  return r
}
