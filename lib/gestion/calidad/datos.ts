import 'server-only'
import { escribir, leer, nuevoId, registrar } from '../almacen'
import type { Auditoria } from './modelo'

// Auditorías de cada hotel: gestion/calidad/<hotel>/auditorias.json
const archivo = (hotel: string) => ['calidad', hotel, 'auditorias.json']

export function auditorias(hotel: string): Auditoria[] {
  return leer<Auditoria[]>(archivo(hotel), [])
}

export function auditoria(hotel: string, id: string): Auditoria | undefined {
  return auditorias(hotel).find((a) => a.id === id)
}

/** Lee, modifica y guarda una auditoría (todo en una sola operación del servidor). */
export function modificar(hotel: string, id: string, usuario: string, accion: string, cambio: (a: Auditoria) => void, detalle?: string) {
  const lista = auditorias(hotel)
  const a = lista.find((x) => x.id === id)
  if (!a) throw new Error('La auditoría no existe')
  cambio(a)
  escribir(archivo(hotel), lista)
  registrar('calidad', hotel, usuario, accion, detalle ? `${a.titulo} · ${detalle}` : a.titulo)
  return a
}

export function crear(hotel: string, usuario: string, datos: Omit<Auditoria, 'id' | 'creada' | 'creadaPor' | 'respuestas' | 'plan' | 'estado'> & Partial<Pick<Auditoria, 'respuestas' | 'plan'>>) {
  const lista = auditorias(hotel)
  const a: Auditoria = { respuestas: {}, plan: {}, ...datos, id: nuevoId(), estado: 'borrador', creada: new Date().toISOString(), creadaPor: usuario }
  lista.push(a)
  escribir(archivo(hotel), lista)
  registrar('calidad', hotel, usuario, 'Creó la auditoría', a.titulo)
  return a
}

export function borrar(hotel: string, id: string, usuario: string) {
  const lista = auditorias(hotel)
  const a = lista.find((x) => x.id === id)
  if (!a) return
  escribir(archivo(hotel), lista.filter((x) => x.id !== id))
  registrar('calidad', hotel, usuario, 'Eliminó la auditoría', a.titulo)
}
