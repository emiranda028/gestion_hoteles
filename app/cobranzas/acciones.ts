'use server'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { cargarDatos } from '@/lib/datos'
import { escribir, leer, nuevoId, rutaArchivo } from '@/lib/gestion/almacen'
import * as db from '@/lib/gestion/cobranzas/datos'
import { leerDetalle } from '@/lib/gestion/cobranzas/excel'
import type { Base, Cliente, Gestion, Listas } from '@/lib/gestion/cobranzas/modelo'
import { requerirUsuario, seccionesPermitidas, veHotel } from '@/lib/usuarios'

async function permiso(hotel: string) {
  const u = await requerirUsuario()
  const h = cargarDatos().hoteles.find((x) => x.id === hotel)
  if (!h || !veHotel(u, h) || !seccionesPermitidas(u).includes('/cobranzas')) throw new Error('Sin permiso para este hotel')
  return u
}
const refrescar = () => revalidatePath('/cobranzas')

export type Vista = {
  archivo: string; hoja: string; facturas: number; clientes: number
  totalAnterior: number; totalNuevo: number
  nuevos: { codigo: string; nombre: string; total: number }[]
  sinDeuda: { codigo: string; nombre: string; totalAnterior: number }[]
  cambios: { codigo: string; nombre: string; antes: number; ahora: number }[]
}

/** Paso 1 de la importación: lee el Excel y muestra qué va a cambiar, sin tocar nada todavía. */
export async function previsualizar(form: FormData): Promise<Vista> {
  const hotel = String(form.get('hotel'))
  await permiso(hotel)
  const archivo = form.get('archivo')
  if (!(archivo instanceof File) || !archivo.size) throw new Error('Elegí el Excel del sistema contable')
  const lectura = await leerDetalle(await archivo.arrayBuffer())
  const actual = db.base(hotel)
  const cl = db.clientes(hotel)
  const totales = (fs: { cliente: string; saldo: number }[]) => {
    const m = new Map<string, number>()
    for (const f of fs) m.set(f.cliente, (m.get(f.cliente) ?? 0) + f.saldo)
    return m
  }
  const antes = totales(actual.facturas), ahora = totales(lectura.facturas)
  const nombre = (c: string) => cl[c]?.nombre || lectura.nombres[c]?.nombre || c
  escribir(['cobranzas', hotel, 'pendiente.json'], { archivo: archivo.name, ...lectura })
  return {
    archivo: archivo.name, hoja: lectura.hoja, facturas: lectura.facturas.length, clientes: ahora.size,
    totalAnterior: [...antes.values()].reduce((s, x) => s + x, 0), totalNuevo: [...ahora.values()].reduce((s, x) => s + x, 0),
    nuevos: [...ahora].filter(([c]) => !antes.has(c) && !cl[c]).map(([c, t]) => ({ codigo: c, nombre: nombre(c), total: t })),
    sinDeuda: [...antes].filter(([c]) => !ahora.has(c)).map(([c, t]) => ({ codigo: c, nombre: nombre(c), totalAnterior: t })),
    cambios: [...ahora].filter(([c, t]) => antes.has(c) && Math.abs(t - antes.get(c)!) > 0.5)
      .map(([c, t]) => ({ codigo: c, nombre: nombre(c), antes: antes.get(c)!, ahora: t }))
      .sort((a, b) => Math.abs(b.ahora - b.antes) - Math.abs(a.ahora - a.antes)).slice(0, 15),
  }
}

/** Paso 2: aplica la importación. La gestión de cada cliente (datos, gestiones, fechas previstas) se conserva. */
export async function aplicarImportacion(hotel: string, corte: string) {
  const u = await permiso(hotel)
  const p = leer<(Awaited<ReturnType<typeof leerDetalle>> & { archivo: string }) | null>(['cobranzas', hotel, 'pendiente.json'], null)
  if (!p) throw new Error('No hay una importación pendiente')
  const cl = db.clientes(hotel)
  for (const [codigo, x] of Object.entries(p.nombres)) {
    cl[codigo] = { ...cl[codigo], codigo, nombre: x.nombre || cl[codigo]?.nombre || codigo, cuit: x.cuit || cl[codigo]?.cuit }
  }
  const base: Base = {
    corte: corte || new Date().toISOString().slice(0, 10),
    importado: { archivo: p.archivo, fecha: new Date().toISOString(), por: u.nombre, facturas: p.facturas.length, clientes: Object.keys(p.nombres).length },
    facturas: p.facturas,
  }
  // las fechas previstas de facturas que ya no están (cobradas) se descartan
  const ids = new Set(p.facturas.map((f) => f.id))
  const prev = Object.fromEntries(Object.entries(db.previstas(hotel)).filter(([id]) => ids.has(id)))
  db.guardar(hotel, 'clientes', cl, u.nombre, 'Actualizó el maestro de clientes')
  db.guardar(hotel, 'previstas', prev, u.nombre, 'Depuró fechas previstas de facturas cobradas')
  db.guardar(hotel, 'base', base, u.nombre, 'Importó facturas', `${p.archivo}: ${p.facturas.length} facturas`)
  await rm(rutaArchivo('cobranzas', hotel, 'pendiente.json'), { force: true })
  refrescar()
}

export async function cambiarCorte(hotel: string, corte: string) {
  const u = await permiso(hotel)
  const b = db.base(hotel)
  db.guardar(hotel, 'base', { ...b, corte }, u.nombre, 'Cambió la fecha de corte', corte)
  refrescar()
}

const CAMPOS: (keyof Cliente)[] = ['nombre', 'cuit', 'grupo', 'condicion', 'respVentas', 'respCobranza', 'deudaPor', 'estado', 'contacto', 'email', 'telefono',
  'eventoNombre', 'eventoFecha', 'blockCode', 'pm', 'invoice']

export async function guardarCliente(hotel: string, codigo: string, datos: Partial<Cliente>) {
  const u = await permiso(hotel)
  const cl = db.clientes(hotel)
  const previo: Cliente = cl[codigo] ?? { codigo, nombre: codigo }
  const limpio = Object.fromEntries(Object.entries(datos).filter(([k]) => CAMPOS.includes(k as keyof Cliente)))
  const cambios = Object.keys(limpio).filter((k) => previo[k as keyof Cliente] !== limpio[k]).join(', ')
  cl[codigo] = { ...previo, ...limpio, codigo, actualizado: new Date().toISOString(), actualizadoPor: u.nombre }
  db.guardar(hotel, 'clientes', cl, u.nombre, 'Editó cliente', `${cl[codigo].nombre}: ${cambios}`)
  refrescar()
  return cl[codigo]
}

/** Gestiones en serie (llamada, mail, promesa…), en lugar de un único campo de observaciones que se pisa. */
export async function nuevaGestion(hotel: string, codigo: string, g: Omit<Gestion, 'id' | 'fecha' | 'por'> & { aplicarPromesa?: boolean }) {
  const u = await permiso(hotel)
  if (!g.texto.trim()) throw new Error('Escribí qué se hizo')
  const todas = db.gestiones(hotel)
  const nueva: Gestion = { id: nuevoId(), fecha: new Date().toISOString(), por: u.nombre, tipo: g.tipo, texto: g.texto.trim(),
    ...(g.promesaFecha ? { promesaFecha: g.promesaFecha } : {}), ...(g.promesaMonto ? { promesaMonto: g.promesaMonto } : {}) }
  todas[codigo] = [nueva, ...(todas[codigo] ?? [])]
  db.guardar(hotel, 'gestiones', todas, u.nombre, 'Registró gestión', `${codigo}: ${g.tipo}`)
  // una promesa de pago fija la fecha prevista de las facturas vencidas del cliente sin fecha
  if (g.tipo === 'promesa' && g.promesaFecha && g.aplicarPromesa) {
    const b = db.base(hotel), prev = db.previstas(hotel)
    for (const f of b.facturas) if (f.cliente === codigo && f.vence <= b.corte && !prev[f.id]) prev[f.id] = g.promesaFecha
    db.guardar(hotel, 'previstas', prev, u.nombre, 'Aplicó promesa de pago', `${codigo} → ${g.promesaFecha}`)
  }
  refrescar()
  return nueva
}

export async function borrarGestion(hotel: string, codigo: string, id: string) {
  const u = await permiso(hotel)
  const todas = db.gestiones(hotel)
  const g = todas[codigo]?.find((x) => x.id === id)
  if (!g) return
  if (g.por !== u.nombre && u.rol !== 'admin') throw new Error('Solo quien la cargó o el administrador pueden borrarla')
  todas[codigo] = todas[codigo].filter((x) => x.id !== id)
  db.guardar(hotel, 'gestiones', todas, u.nombre, 'Borró gestión', `${codigo}: ${g.texto.slice(0, 60)}`)
  refrescar()
}

/** Fecha prevista de cobro para una o varias facturas (vacío = quitarla). */
export async function fijarPrevista(hotel: string, ids: string[], fecha: string | null) {
  const u = await permiso(hotel)
  const prev = db.previstas(hotel)
  for (const id of ids) {
    if (fecha) prev[id] = fecha
    else delete prev[id]
  }
  db.guardar(hotel, 'previstas', prev, u.nombre, 'Fijó fecha prevista de cobro', `${ids.length} factura(s) → ${fecha ?? 'sin fecha'}`)
  refrescar()
}

export async function guardarListas(hotel: string, listas: Listas) {
  const u = await permiso(hotel)
  if (u.rol === 'cliente') throw new Error('Solo Gerencia o el administrador pueden cambiar las listas')
  const limpio = Object.fromEntries(Object.entries(listas).map(([k, v]) => [k, [...new Set((v as string[]).map((x) => x.trim()).filter(Boolean))]]))
  db.guardar(hotel, 'listas', limpio, u.nombre, 'Editó las listas')
  refrescar()
}

export async function subirAdjunto(form: FormData) {
  const hotel = String(form.get('hotel')), codigo = String(form.get('cliente'))
  const u = await permiso(hotel)
  const archivo = form.get('archivo')
  if (!(archivo instanceof File) || !archivo.size) throw new Error('Elegí un archivo')
  if (archivo.size > 10 * 1024 * 1024) throw new Error('El archivo pesa más de 10 MB')
  const id = nuevoId()
  const carpeta = rutaArchivo('cobranzas', hotel, 'adjuntos', path.basename(codigo))
  await mkdir(carpeta, { recursive: true })
  await writeFile(path.join(carpeta, id), Buffer.from(await archivo.arrayBuffer()), { mode: 0o600 })
  const cl = db.clientes(hotel)
  const c = cl[codigo] ?? { codigo, nombre: codigo }
  c.adjuntos = [...(c.adjuntos ?? []), { id, nombre: archivo.name.slice(-120), tipo: archivo.type || 'application/octet-stream', tamano: archivo.size, fecha: new Date().toISOString(), por: u.nombre }]
  cl[codigo] = c
  db.guardar(hotel, 'clientes', cl, u.nombre, 'Adjuntó archivo', `${c.nombre}: ${archivo.name}`)
  refrescar()
}

export async function quitarAdjunto(hotel: string, codigo: string, id: string) {
  const u = await permiso(hotel)
  const cl = db.clientes(hotel)
  const c = cl[codigo]
  if (!c?.adjuntos) return
  c.adjuntos = c.adjuntos.filter((a) => a.id !== id)
  db.guardar(hotel, 'clientes', cl, u.nombre, 'Quitó adjunto', c.nombre)
  await rm(path.join(rutaArchivo('cobranzas', hotel, 'adjuntos', path.basename(codigo)), path.basename(id)), { force: true })
  refrescar()
}
