import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseCsv } from './csv.ts'
import type { Dia } from './kpi.ts'

// Todo se trabaja en dólares (así vienen los reportes de Opera). El tipo de cambio BNA vendedor
// solo se usa para ver en pesos y para pasar a dólares los saldos en pesos de las disponibilidades.

export type Hotel = { id: string; nombre: string; grupo: string; habitaciones: number; activo: boolean }
export type Grupo = { id: string; nombre: string }

export type DiaForecast = { f: string; h: string; ocup: number; disp: number; ingHab: number; grp: number }
export type FotoPickup = { r: string; h: string; mes: string; noches: number; grp: number; rev: number; occ: number }
export type FlashHotel = {
  h: string
  fecha: string
  c: Record<string, [number | null, number | null, number | null]>
  anterior: Record<string, [number | null, number | null, number | null]> | null // mismo día del año anterior
}
export type BonvoyMes = { mes: string; h: string; nivel: string; n: number }
export type PaisMes = { mes: string; h: string; pais: string; continente: string; n: number }
// Disponibilidades tal cual las informa cada grupo: pesos en pesos, dólares y euros en su moneda,
// y el tipo de cambio que usa el grupo.
export type Disponible = {
  g: string
  f: string
  total: number // DISPONIBILIDADES (ARS, incluye proyectados)
  subtotal: number // bancos + FCI + moneda extranjera valuada (ARS)
  monedaLocal: number
  monedaExtranjera: number // moneda extranjera valuada en pesos al tipo de cambio del grupo
  usd: number // dólares en moneda original
  eur: number // euros en moneda original
  tcUsd: number
  tcEur: number
  bancosPesos: number
  inversiones: number
  cobros: number
  cheques: number // negativo
  pagos: number // negativo
}
export type CuentaBanco = {
  g: string; f: string; seccion: string; empresa: string; banco: string; cuenta: string
  moneda: string; ars: number; original: number
}
export type EstadoIngesta = {
  ejecutado: string
  archivos: { origen: string; tipo: string; hotel: string | null; fecha: string | null; ok: boolean; detalle?: string; avisos: string[] }[]
} | null

export type Datos = {
  demo: boolean
  hoteles: Hotel[]
  grupos: Grupo[]
  dias: Dia[]
  forecast: DiaForecast[]
  pickup: FotoPickup[]
  flash: FlashHotel[]
  bonvoy: BonvoyMes[]
  paises: PaisMes[]
  disponibles: Disponible[]
  cuentas: CuentaBanco[]
  tipoCambio: { fecha: string; valor: number } | null
  desde: string
  hasta: string
  ingesta: EstadoIngesta
}

const DATA = path.join(process.cwd(), 'data')

const HOTELES: Hotel[] = [
  { id: 'marriott', nombre: 'Marriott Buenos Aires', grupo: 'panatel', habitaciones: 300, activo: true },
  { id: 'sheraton-mdq', nombre: 'Sheraton Mar del Plata', grupo: 'panatel', habitaciones: 194, activo: true },
  { id: 'sheraton-bcr', nombre: 'Sheraton Bariloche', grupo: 'panatel', habitaciones: 161, activo: true },
  { id: 'city-express', nombre: 'City Express Palermo', grupo: 'numah', habitaciones: 51, activo: true },
  { id: 'maitei', nombre: 'Maitei Posadas (histórico)', grupo: 'numah', habitaciones: 98, activo: false },
  // datos de demostración (data/demo)
  { id: 'demo-centro', nombre: 'Hotel Demo Centro', grupo: 'demo', habitaciones: 220, activo: true },
  { id: 'demo-costa', nombre: 'Hotel Demo Costa', grupo: 'demo', habitaciones: 140, activo: true },
]
const GRUPOS: Grupo[] = [
  { id: 'panatel', nombre: 'Panatel' },
  { id: 'numah', nombre: 'Numah' },
  { id: 'demo', nombre: 'Grupo Demo' },
]

const num = (v: string | undefined) => {
  if (v === undefined || v === '') return 0
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}
const numONull = (v: string | undefined) => (v === undefined || v === '' ? null : num(v))

function anioAntes(f: string) {
  return `${Number(f.slice(0, 4)) - 1}${f.slice(4)}`
}

let cache: Datos | null = null

export function cargarDatos(): Datos {
  if (cache && process.env.NODE_ENV === 'production') return cache
  const demo = !existsSync(path.join(DATA, 'hf.csv'))
  const carpeta = demo ? path.join(DATA, 'demo') : DATA
  const leer = (n: string) => {
    const r = path.join(carpeta, n)
    return existsSync(r) ? parseCsv(readFileSync(r, 'utf-8')) : []
  }

  // --- tipo de cambio (completado hacia adelante para fines de semana y feriados)
  const tcFilas = leer('tipo_cambio.csv').sort((a, b) => a.fecha.localeCompare(b.fecha))
  const tcF = tcFilas.map((r) => r.fecha)
  const tcV = tcFilas.map((r) => num(r.ars_por_usd))
  const tcPara = (f: string): number | null => {
    let lo = 0, hi = tcF.length - 1, res = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (tcF[mid] <= f) { res = mid; lo = mid + 1 } else hi = mid - 1
    }
    return res >= 0 ? tcV[res] : tcV[0] ?? null
  }

  // --- flash: índice (hotel|fecha) -> concepto -> [día, mes, año]
  const flashIdx = new Map<string, Record<string, [number | null, number | null, number | null]>>()
  for (const r of leer('flash.csv')) {
    const k = `${r.hotel}|${r.fecha}`
    let c = flashIdx.get(k)
    if (!c) flashIdx.set(k, (c = {}))
    c[r.concepto] = [numONull(r.dia), numONull(r.mes), numONull(r.anio)]
  }
  const flashDia = (h: string, f: string, concepto: string) => flashIdx.get(`${h}|${f}`)?.[concepto]?.[0] ?? null

  // --- H&F: historia -> días del tablero; forecast -> próximos días
  const hab = new Map(HOTELES.map((h) => [h.id, h.habitaciones]))
  const dias: Dia[] = []
  const forecast: DiaForecast[] = []
  const hfFilas = leer('hf.csv')
  const ultimaHistoria = new Map<string, string>()
  for (const r of hfFilas) {
    if (r.tipo === 'History' && r.fecha > (ultimaHistoria.get(r.hotel) ?? '')) ultimaHistoria.set(r.hotel, r.fecha)
  }
  for (const r of hfFilas) {
    const occ = num(r.total_occ)
    const ocup = occ - num(r.house_use)
    const pct = num(r.occ_pct)
    const disp = flashDia(r.hotel, r.fecha, 'Total Rooms in Hotel') ?? (pct > 0 ? Math.round(occ / pct) : hab.get(r.hotel) ?? 0)
    const ingHab = num(r.room_revenue)
    if (r.tipo === 'History' || r.fecha <= (ultimaHistoria.get(r.hotel) ?? '')) {
      const ayb = flashDia(r.hotel, r.fecha, 'Food And Beverage Revenue') ?? 0
      const otros = flashDia(r.hotel, r.fecha, 'Other Revenue') ?? 0
      const tot = flashDia(r.hotel, r.fecha, 'Total Revenue') ?? flashDia(r.hotel, r.fecha, 'Ventas Totales')
      dias.push({
        f: r.fecha, h: r.hotel, disp, ocup, pax: num(r.personas), ingHab, ingAyb: ayb, ingOtros: otros,
        ingTot: tot ?? ingHab + ayb + otros, tc: tcPara(r.fecha),
      })
    } else {
      forecast.push({ f: r.fecha, h: r.hotel, ocup, disp, ingHab, grp: num(r.deduct_group) })
    }
  }
  dias.sort((a, b) => a.f.localeCompare(b.f) || a.h.localeCompare(b.h))
  forecast.sort((a, b) => a.f.localeCompare(b.f) || a.h.localeCompare(b.h))

  // --- último flash de cada hotel + el mismo día del año anterior
  const ultimoFlash = new Map<string, string>()
  for (const k of flashIdx.keys()) {
    const [h, f] = k.split('|')
    if (f > (ultimoFlash.get(h) ?? '')) ultimoFlash.set(h, f)
  }
  const flash: FlashHotel[] = [...ultimoFlash].map(([h, fecha]) => ({
    h, fecha, c: flashIdx.get(`${h}|${fecha}`)!, anterior: flashIdx.get(`${h}|${anioAntes(fecha)}`) ?? null,
  }))

  const pickup: FotoPickup[] = leer('pickup.csv').map((r) => ({
    r: r.fecha_reporte, h: r.hotel, mes: r.mes, noches: num(r.noches), grp: num(r.grupo), rev: num(r.revenue),
    occ: num(r.occ_pct),
  }))

  const bonvoyIdx = new Map<string, BonvoyMes>()
  for (const r of leer('bonvoy.csv')) {
    const mes = r.fecha.slice(0, 7)
    const k = `${mes}|${r.hotel}|${r.nivel}`
    const x = bonvoyIdx.get(k)
    if (x) x.n += num(r.cantidad)
    else bonvoyIdx.set(k, { mes, h: r.hotel, nivel: r.nivel, n: num(r.cantidad) })
  }

  // --- disponibilidades: un registro por grupo y día
  const bloques = new Map<string, Record<string, string>[]>()
  for (const r of leer('disponibilidades.csv')) {
    const k = `${r.grupo}|${r.fecha}`
    const b = bloques.get(k)
    if (b) b.push(r)
    else bloques.set(k, [r])
  }
  const disponibles: Disponible[] = [...bloques].map(([k, filas]) => {
    const [g, f] = k.split('|')
    const suma = (concepto: string, tipo?: string, moneda?: string) =>
      filas.filter((x) => x.concepto === concepto && (!tipo || x.tipo_moneda === tipo) && (!moneda || x.moneda === moneda))
        .reduce((s, x) => s + num(x.importe), 0)
    const bancosPesos = suma('Bancos pesos')
    const inversiones = suma('Inversiones')
    const monedaExtranjera = suma('Moneda extranjera', 'ARS', 'Local')
    return {
      g, f, total: suma('DISPONIBILIDADES'), subtotal: bancosPesos + inversiones + monedaExtranjera,
      monedaLocal: suma('Moneda Local'), monedaExtranjera,
      usd: suma('Moneda extranjera', 'USD', 'Extranjera'), eur: suma('Moneda extranjera', 'EUR', 'Extranjera'),
      tcUsd: suma('Tipo de cambio USD'), tcEur: suma('Tipo de cambio EUR'), bancosPesos, inversiones,
      cobros: suma('Cobranzas Proyectadas') + suma('Efectivo - Recaudación') + suma('Aportes socios'),
      cheques: suma('Cheques emitidos'), pagos: suma('Pagos programados'),
    }
  }).sort((a, b) => a.f.localeCompare(b.f) || a.g.localeCompare(b.g))

  const cuentasFilas = leer('bancos.csv')
  const ultimaCuenta = new Map<string, string>()
  for (const r of cuentasFilas) if (r.fecha > (ultimaCuenta.get(r.grupo) ?? '')) ultimaCuenta.set(r.grupo, r.fecha)
  const cuentas: CuentaBanco[] = cuentasFilas
    .filter((r) => ultimaCuenta.get(r.grupo) === r.fecha)
    .map((r) => ({ g: r.grupo, f: r.fecha, seccion: r.seccion, empresa: r.empresa, banco: r.banco, cuenta: r.cuenta,
      moneda: r.moneda, ars: num(r.importe_ars), original: num(r.importe_moneda) }))

  const presentes = new Set(dias.map((d) => d.h))
  const rutaEstado = path.join(DATA, 'ultima_ingesta.json')
  cache = {
    demo,
    hoteles: HOTELES.filter((h) => presentes.has(h.id)),
    grupos: GRUPOS.filter((g) => disponibles.some((d) => d.g === g.id)),
    dias,
    forecast,
    pickup,
    flash,
    bonvoy: [...bonvoyIdx.values()],
    paises: leer('paises.csv').map((r) => ({ mes: r.mes, h: r.hotel, pais: r.pais, continente: r.continente, n: num(r.huespedes) })),
    disponibles,
    cuentas,
    tipoCambio: tcF.length ? { fecha: tcF[tcF.length - 1], valor: tcV[tcV.length - 1] } : null,
    desde: dias[0]?.f ?? '',
    hasta: dias[dias.length - 1]?.f ?? '',
    ingesta: !demo && existsSync(rutaEstado) ? JSON.parse(readFileSync(rutaEstado, 'utf-8')) : null,
  }
  return cache
}

/** Datos que necesita cada pantalla (evita mandar todo al navegador). */
export function datosTablero() {
  const d = cargarDatos()
  return { demo: d.demo, hoteles: d.hoteles, dias: d.dias, flash: d.flash, bonvoy: d.bonvoy, paises: d.paises, desde: d.desde, hasta: d.hasta }
}
