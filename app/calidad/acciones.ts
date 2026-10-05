'use server'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { cargarDatos } from '@/lib/datos'
import { nuevoId, rutaArchivo } from '@/lib/gestion/almacen'
import { itemsDe } from '@/lib/gestion/calidad/calculo'
import * as db from '@/lib/gestion/calidad/datos'
import type { Accion, Respuesta } from '@/lib/gestion/calidad/modelo'
import { programa } from '@/lib/gestion/calidad/programas'
import { requerirUsuario, seccionesPermitidas, veHotel } from '@/lib/usuarios'

async function permiso(hotel: string) {
  const u = await requerirUsuario()
  const h = cargarDatos().hoteles.find((x) => x.id === hotel)
  if (!h || !veHotel(u, h) || !seccionesPermitidas(u).includes('/calidad')) throw new Error('Sin permiso para este hotel')
  return u
}

function editable(hotel: string, id: string) {
  const a = db.auditoria(hotel, id)
  if (!a) throw new Error('La auditoría no existe')
  if (a.estado === 'cerrada') throw new Error('La auditoría está cerrada: hay que reabrirla para modificarla')
  return a
}

export async function nuevaAuditoria(datos: { hotel: string; programa: string; titulo: string; periodo: string; fecha: string; auditor: string; ejemplo?: boolean }) {
  const u = await permiso(datos.hotel)
  const prog = programa(datos.programa)
  if (!prog) throw new Error('Programa desconocido')
  let respuestas: Record<string, Respuesta> | undefined
  if (datos.ejemplo) {
    // auditoría de ejemplo para presentar la herramienta: respuestas al azar, sesgadas a cumplir
    respuestas = {}
    let semilla = [...datos.titulo].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7) || 7
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647)
    for (const nodo of prog.nodos) {
      const sesgo = 0.45 + azar() * 0.5 // cada área cumple distinto, como en la realidad
      for (const it of itemsDe(nodo)) {
        const escala = prog.escalas[it.e ?? 0]
        if (azar() < 0.04) { respuestas[it.c] = { na: true, por: u.nombre, fecha: datos.fecha }; continue }
        const r = azar()
        const o = it.m ? escala.map((_, i) => i).filter(() => azar() < sesgo + 0.1)
          : [r < sesgo ? 0 : r < sesgo + (1 - sesgo) / 2 ? Math.min(1, escala.length - 1) : escala.length - 1]
        respuestas[it.c] = { o, por: u.nombre, fecha: datos.fecha }
      }
    }
  }
  const a = db.crear(datos.hotel, u.nombre, {
    programa: prog.id, hotel: datos.hotel, titulo: datos.titulo.trim() || prog.nombre, periodo: datos.periodo.trim(),
    fecha: datos.fecha, auditor: datos.auditor.trim() || u.nombre, ejemplo: datos.ejemplo, respuestas,
  })
  revalidatePath('/calidad')
  return a.id
}

export async function responder(hotel: string, id: string, item: string, cambio: Partial<Respuesta>) {
  const u = await permiso(hotel)
  editable(hotel, id)
  db.modificar(hotel, id, u.nombre, 'Respondió', (a) => {
    const previa = a.respuestas[item] ?? {}
    const r: Respuesta = { ...previa, ...cambio, por: u.nombre, fecha: new Date().toISOString() }
    if (cambio.na) delete r.o
    if (cambio.o) delete r.na
    a.respuestas[item] = r
  }, item)
}

export async function guardarAccion(hotel: string, id: string, nodo: string, accion: Accion) {
  const u = await permiso(hotel)
  db.modificar(hotel, id, u.nombre, 'Actualizó el plan de acción', (a) => { a.plan[nodo] = accion }, `${nodo} → ${accion.estado}`)
  revalidatePath(`/calidad/${hotel}/${id}`)
}

export async function cambiarEstado(hotel: string, id: string, estado: 'borrador' | 'cerrada', motivo?: string) {
  const u = await permiso(hotel)
  if (estado === 'borrador' && u.rol === 'cliente') throw new Error('Solo Gerencia o el administrador pueden reabrir una auditoría')
  db.modificar(hotel, id, u.nombre, estado === 'cerrada' ? 'Cerró la auditoría' : 'Reabrió la auditoría', (a) => {
    a.estado = estado
    if (estado === 'cerrada') { a.cerrada = new Date().toISOString(); a.cerradaPor = u.nombre }
  }, motivo)
  revalidatePath('/calidad')
  revalidatePath(`/calidad/${hotel}/${id}`)
}

export async function eliminarAuditoria(hotel: string, id: string) {
  const u = await permiso(hotel)
  if (u.rol !== 'admin') throw new Error('Solo el administrador puede eliminar auditorías')
  db.borrar(hotel, id, u.nombre)
  await rm(rutaArchivo('calidad', hotel, 'evidencias', id), { recursive: true, force: true })
  revalidatePath('/calidad')
}

/** Adjunta un archivo de evidencia a un ítem. Se guarda en el servidor, no dentro de la auditoría. */
export async function subirEvidencia(form: FormData) {
  const hotel = String(form.get('hotel')), id = String(form.get('auditoria')), item = String(form.get('item'))
  const u = await permiso(hotel)
  editable(hotel, id)
  const archivo = form.get('archivo')
  if (!(archivo instanceof File) || !archivo.size) throw new Error('Elegí un archivo')
  if (archivo.size > 10 * 1024 * 1024) throw new Error('El archivo pesa más de 10 MB')
  const eid = nuevoId()
  const nombre = archivo.name.replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ]/g, '_').slice(-120)
  const carpeta = rutaArchivo('calidad', hotel, 'evidencias', id)
  await mkdir(carpeta, { recursive: true })
  await writeFile(path.join(carpeta, eid), Buffer.from(await archivo.arrayBuffer()), { mode: 0o600 })
  db.modificar(hotel, id, u.nombre, 'Adjuntó evidencia', (a) => {
    const r = a.respuestas[item] ?? {}
    r.ev = [...(r.ev ?? []), { id: eid, nombre, tipo: archivo.type || 'application/octet-stream', tamano: archivo.size, fecha: new Date().toISOString(), por: u.nombre }]
    a.respuestas[item] = r
  }, `${item}: ${nombre}`)
}

export async function quitarEvidencia(hotel: string, id: string, item: string, eid: string) {
  const u = await permiso(hotel)
  editable(hotel, id)
  db.modificar(hotel, id, u.nombre, 'Quitó evidencia', (a) => {
    const r = a.respuestas[item]
    if (r?.ev) r.ev = r.ev.filter((e) => e.id !== eid)
  }, item)
  await rm(path.join(rutaArchivo('calidad', hotel, 'evidencias', id), path.basename(eid)), { force: true })
}
