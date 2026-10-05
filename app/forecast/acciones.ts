'use server'
import { revalidatePath } from 'next/cache'
import { cargarDatos } from '@/lib/datos'
import { nuevoId } from '@/lib/gestion/almacen'
import { celda, mesesConReal, proyectarAnio, proyectarMes } from '@/lib/gestion/forecast/calculo'
import * as db from '@/lib/gestion/forecast/datos'
import { leerBase } from '@/lib/gestion/forecast/excel'
import { MESES_LARGOS, clave, type Celda, type CapaEditable } from '@/lib/gestion/forecast/modelo'
import { requerirUsuario, seccionesPermitidas, veHotel } from '@/lib/usuarios'

async function permiso(hotel: string) {
  const u = await requerirUsuario()
  const h = cargarDatos().hoteles.find((x) => x.id === hotel)
  if (!h || !veHotel(u, h) || !seccionesPermitidas(u).includes('/forecast')) throw new Error('Sin permiso para este hotel')
  return { u, habitaciones: h.habitaciones }
}
const refrescar = () => revalidatePath('/forecast')

/** Importa una base en el formato de siempre. Los códigos nuevos se suman solos a la estructura (no se descartan filas). */
export async function importarBase(form: FormData) {
  const hotel = String(form.get('hotel')), anio = Number(form.get('anio')), capa = String(form.get('capa')) as CapaEditable
  const { u, habitaciones } = await permiso(hotel)
  if (!['budget', 'real', 'forecast'].includes(capa)) throw new Error('Capa desconocida')
  const archivo = form.get('archivo')
  if (!(archivo instanceof File) || !archivo.size) throw new Error('Elegí el archivo')
  const { codigos, valores } = await leerBase(await archivo.arrayBuffer())

  const est = db.estructura(hotel)
  const existentes = new Map(est.map((c) => [clave(c), c]))
  let nuevos = 0
  for (const c of codigos) {
    const k = clave(c)
    if (!existentes.has(k)) { est.push(c); existentes.set(k, c); nuevos++ } else existentes.get(k)!.desc = c.desc
  }
  db.guardarEstructura(hotel, est)

  const a = db.anio(hotel, anio, habitaciones)
  const meses = new Set<number>()
  for (const [k, fila] of Object.entries(valores)) {
    if (capa === 'real') {
      // el Real se carga mes a mes: solo pisa los meses que vienen con dato
      const actual = a.real[k] ?? Array(12).fill(null)
      fila.forEach((v, m) => { if (v) { actual[m] = v; meses.add(m) } })
      a.real[k] = actual
    } else {
      a[capa][k] = fila
      fila.forEach((v, m) => v && meses.add(m))
    }
  }
  if (capa === 'real') {
    // con Real cargado, los códigos sin venta en ese mes quedan en cero (no se arrastra el Budget)
    for (const k of existentes.keys()) {
      const fila = a.real[k] ?? Array(12).fill(null)
      for (const m of meses) if (!fila[m]) fila[m] = [0, 0]
      a.real[k] = fila
    }
  }
  a.importado[capa] = { archivo: archivo.name, fecha: new Date().toISOString(), por: u.nombre, codigos: codigos.length }
  const nombre = { budget: 'Budget', real: 'Real', forecast: 'Forecast' }[capa]
  db.guardarAnio(hotel, a, u.nombre, `Importó ${nombre}`, `${archivo.name}: ${codigos.length} códigos`)
  refrescar()
  return { codigos: codigos.length, nuevos, meses: [...meses].sort((x, y) => x - y).map((m) => MESES_LARGOS[m]) }
}

/** Guarda los valores de un mes de una capa (editor). null = sin valor propio (usa el Budget). */
export async function guardarMes(hotel: string, anio: number, capa: 'forecast' | 'budget', m: number, valores: Record<string, Celda | null>) {
  const { u, habitaciones } = await permiso(hotel)
  const a = db.anio(hotel, anio, habitaciones)
  if (capa === 'forecast' && mesesConReal(a)[m]) throw new Error('Ese mes ya tiene Real: el forecast toma el Real')
  for (const [k, v] of Object.entries(valores)) {
    const fila = a[capa][k] ?? Array(12).fill(null)
    fila[m] = v
    a[capa][k] = fila
  }
  db.guardarAnio(hotel, a, u.nombre, `Editó ${capa === 'forecast' ? 'el Forecast' : 'el Budget'}`, MESES_LARGOS[m])
  refrescar()
}

/** Proyección de un mes desde su total (on the books + pickup esperado), repartida con la mezcla de referencia. */
export async function proyectarMesTotal(hotel: string, anio: number, m: number, rnTotal: number, adrTotal: number, referencia: 'budget' | 'anterior') {
  const { u, habitaciones } = await permiso(hotel)
  if (rnTotal <= 0 || adrTotal <= 0) throw new Error('Cargá noches y ADR del mes')
  const a = db.anio(hotel, anio, habitaciones), previo = db.anio(hotel, anio - 1, habitaciones)
  const cerrados = mesesConReal(a)
  if (cerrados[m]) throw new Error('Ese mes ya tiene Real')
  const cods = db.estructura(hotel).map(clave)
  const ref = (k: string) => celda(referencia === 'anterior' ? 'anterior' : 'budget', k, m, a, previo, cerrados)
  const p = proyectarMes(cods, ref, rnTotal, adrTotal)
  for (const k of cods) {
    const fila = a.forecast[k] ?? Array(12).fill(null)
    fila[m] = p[k]
    a.forecast[k] = fila
  }
  db.guardarAnio(hotel, a, u.nombre, 'Proyectó el mes', `${MESES_LARGOS[m]}: ${rnTotal} noches a USD ${adrTotal}`)
  refrescar()
}

/** Arma el Budget de un año a partir del año anterior (su forecast o su real) con ajustes de noches y tarifa. */
export async function proyectarBudget(hotel: string, anio: number, base: 'forecast' | 'real', ajusteRn: number, ajusteAdr: number) {
  const { u, habitaciones } = await permiso(hotel)
  const anterior = db.anio(hotel, anio - 1, habitaciones), dosAntes = db.anio(hotel, anio - 2, habitaciones)
  const cerrados = mesesConReal(anterior)
  const cods = db.estructura(hotel).map(clave)
  const capa = proyectarAnio(cods, (k, m) => celda(base, k, m, anterior, dosAntes, cerrados), ajusteRn, ajusteAdr)
  const a = db.anio(hotel, anio, habitaciones)
  a.budget = capa
  a.inventario = anterior.inventario.slice()
  db.guardarAnio(hotel, a, u.nombre, 'Armó el Budget automático',
    `base ${base === 'forecast' ? 'forecast' : 'real'} ${anio - 1}, noches ${(ajusteRn * 100).toFixed(1)}%, tarifa ${(ajusteAdr * 100).toFixed(1)}%`)
  refrescar()
}

export async function guardarParametros(hotel: string, anio: number, inventario: number[], tcBudget: (number | null)[]) {
  const { u, habitaciones } = await permiso(hotel)
  const a = db.anio(hotel, anio, habitaciones)
  a.inventario = inventario.map((x) => Math.max(0, Math.round(x || 0)))
  a.tcBudget = tcBudget.map((x) => (x && x > 0 ? x : null))
  db.guardarAnio(hotel, a, u.nombre, 'Editó inventario y tipo de cambio')
  refrescar()
}

/** Guarda una foto del forecast actual con nombre (para comparar después contra lo que pasó). */
export async function guardarVersion(hotel: string, anio: number, nombre: string) {
  const { u, habitaciones } = await permiso(hotel)
  const a = db.anio(hotel, anio, habitaciones), previo = db.anio(hotel, anio - 1, habitaciones)
  const cerrados = mesesConReal(a)
  const cods = db.estructura(hotel).map(clave)
  const foto = Object.fromEntries(cods.map((k) => [k, Array.from({ length: 12 }, (_, m) => celda('forecast', k, m, a, previo, cerrados))]))
  a.versiones = [{ id: nuevoId(), nombre: nombre.trim() || `Forecast ${new Date().toLocaleDateString('es-AR')}`, fecha: new Date().toISOString(), por: u.nombre, forecast: foto }, ...a.versiones].slice(0, 24)
  db.guardarAnio(hotel, a, u.nombre, 'Guardó versión del forecast', nombre)
  refrescar()
}

export async function borrarVersion(hotel: string, anio: number, id: string) {
  const { u, habitaciones } = await permiso(hotel)
  const a = db.anio(hotel, anio, habitaciones)
  a.versiones = a.versiones.filter((v) => v.id !== id)
  db.guardarAnio(hotel, a, u.nombre, 'Borró una versión del forecast')
  refrescar()
}
