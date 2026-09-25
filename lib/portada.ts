import 'server-only'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { DATA } from './datos'

// Fotos de la portada del login: las sube LTELC desde "Datos" y quedan en el servidor (nunca en GitHub)
export const HOTELES_PORTADA = [
  { id: 'marriott', nombre: 'Marriott Buenos Aires', lugar: 'Buenos Aires' },
  { id: 'sheraton-mdq', nombre: 'Sheraton Mar del Plata', lugar: 'Mar del Plata' },
  { id: 'sheraton-bcr', nombre: 'Sheraton Bariloche', lugar: 'San Carlos de Bariloche' },
  { id: 'city-express', nombre: 'City Express Palermo', lugar: 'Palermo, Buenos Aires' },
] as const

export const CARPETA_PORTADA = path.join(DATA, 'portada')
export const rutaFoto = (id: string) => path.join(/*turbopackIgnore: true*/ CARPETA_PORTADA, `${id}.jpg`)

/** Hoteles de la portada con la versión de su foto (para refrescar la caché al cambiarla), o null si no tiene. */
export function portada() {
  return HOTELES_PORTADA.map((h) => {
    const r = rutaFoto(h.id)
    return { ...h, foto: existsSync(r) ? Math.round(statSync(r).mtimeMs).toString(36) : null }
  })
}
