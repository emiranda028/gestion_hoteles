// Sesión firmada en una cookie (HMAC-SHA256). Se usa en el proxy y en el servidor.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const COOKIE = 'lt_sesion'
export const DURACION_HORAS = 12

export type Sesion = { u: string; rol: 'admin' | 'cliente'; exp: number }

function secreto() {
  const s = process.env.SESSION_SECRET
  if (!s && process.env.NODE_ENV === 'production') throw new Error('Falta la variable SESSION_SECRET')
  return s || 'solo-para-desarrollo-local'
}

const firmar = (datos: string) => createHmac('sha256', secreto()).update(datos).digest('base64url')

export function crearToken(u: string, rol: Sesion['rol']): string {
  const datos = Buffer.from(JSON.stringify({ u, rol, exp: Date.now() + DURACION_HORAS * 3600e3 })).toString('base64url')
  return `${datos}.${firmar(datos)}`
}

export function leerToken(token: string | undefined): Sesion | null {
  if (!token) return null
  const [datos, firma] = token.split('.')
  if (!datos || !firma) return null
  const esperada = Buffer.from(firmar(datos))
  const recibida = Buffer.from(firma)
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null
  try {
    const s = JSON.parse(Buffer.from(datos, 'base64url').toString()) as Sesion
    return s.exp > Date.now() ? s : null
  } catch {
    return null
  }
}
