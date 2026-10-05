import 'server-only'
import { escribir, leer, registrar } from '../almacen'
import { LISTAS_INICIALES, type Base, type Cliente, type Gestion, type Listas } from './modelo'

// gestion/cobranzas/<hotel>/{base,clientes,gestiones,previstas,listas}.json
const f = (hotel: string, n: string) => ['cobranzas', hotel, `${n}.json`]

export const base = (hotel: string) => leer<Base>(f(hotel, 'base'), { corte: new Date().toISOString().slice(0, 10), facturas: [] })
export const clientes = (hotel: string) => leer<Record<string, Cliente>>(f(hotel, 'clientes'), {})
export const gestiones = (hotel: string) => leer<Record<string, Gestion[]>>(f(hotel, 'gestiones'), {})
export const previstas = (hotel: string) => leer<Record<string, string>>(f(hotel, 'previstas'), {})
export const listas = (hotel: string) => ({ ...LISTAS_INICIALES, ...leer<Partial<Listas>>(f(hotel, 'listas'), {}) })

export function guardar(hotel: string, nombre: 'base' | 'clientes' | 'gestiones' | 'previstas' | 'listas', valor: unknown, usuario: string, accion: string, detalle?: string) {
  escribir(f(hotel, nombre), valor)
  registrar('cobranzas', hotel, usuario, accion, detalle)
}
