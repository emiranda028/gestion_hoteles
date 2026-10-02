import 'server-only'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DATA } from './datos'
import { SECCIONES } from './secciones'
import { COOKIE, leerToken } from './sesion'

// Usuarios de la app, administrados por LTELC desde /admin/usuarios.
// Se guardan en DATA_DIR/usuarios.json con la contraseña cifrada (scrypt + sal).

// admin: LTELC (ve todo, administra usuarios y datos) · gerencia: ve todos los hoteles, sin administración
export type Rol = 'admin' | 'gerencia' | 'cliente'
export type Usuario = {
  usuario: string
  nombre: string
  rol: Rol
  grupos: string[] // grupos de hoteles que puede ver ('*' = todos)
  hoteles?: string[] // si tiene, solo ve esos hoteles dentro de sus grupos (vacío o ausente = todos los del grupo)
  disponibilidades?: boolean // ve las disponibilidades de sus grupos (ausente = sí)
  secciones?: string[] // solapas habilitadas (ausente = todas); el administrador siempre ve todas
  activo: boolean
  hash: string
  sal: string
  creado: string
  ultimoIngreso?: string
}
export type UsuarioPublico = Omit<Usuario, 'hash' | 'sal'>

const ARCHIVO = () => path.join(DATA, 'usuarios.json')

export function leerUsuarios(): Usuario[] {
  if (!existsSync(ARCHIVO())) {
    // primer arranque: se crea el administrador inicial desde las variables de entorno
    const u = process.env.ADMIN_USUARIO, p = process.env.ADMIN_PASSWORD
    if (u && p) {
      const admin = nuevoUsuario({ usuario: u, nombre: 'Administrador LTELC', rol: 'admin', grupos: ['*'], activo: true }, p)
      guardarUsuarios([admin])
      return [admin]
    }
    return []
  }
  return JSON.parse(readFileSync(ARCHIVO(), 'utf-8'))
}

export function guardarUsuarios(lista: Usuario[]) {
  mkdirSync(path.dirname(ARCHIVO()), { recursive: true })
  const tmp = ARCHIVO() + '.tmp'
  writeFileSync(tmp, JSON.stringify(lista, null, 1), { mode: 0o600 })
  renameSync(tmp, ARCHIVO())
}

function cifrar(password: string, sal: string) {
  return scryptSync(password, sal, 64).toString('hex')
}

export function nuevoUsuario(datos: Omit<Usuario, 'hash' | 'sal' | 'creado'>, password: string): Usuario {
  const sal = randomBytes(16).toString('hex')
  return { ...datos, usuario: datos.usuario.trim().toLowerCase(), sal, hash: cifrar(password, sal), creado: new Date().toISOString() }
}

export function cambiarPassword(u: Usuario, password: string): Usuario {
  const sal = randomBytes(16).toString('hex')
  return { ...u, sal, hash: cifrar(password, sal) }
}

export function verificar(usuario: string, password: string): Usuario | null {
  const u = leerUsuarios().find((x) => x.usuario === usuario.trim().toLowerCase())
  if (!u || !u.activo) return null
  const a = Buffer.from(cifrar(password, u.sal), 'hex'), b = Buffer.from(u.hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b) ? u : null
}

export function publico(u: Usuario): UsuarioPublico {
  const { hash: _h, sal: _s, ...resto } = u
  return resto
}

/** Usuario de la sesión actual (o null). Se relee del archivo: un usuario dado de baja pierde el acceso. */
export async function usuarioActual(): Promise<UsuarioPublico | null> {
  const s = leerToken((await cookies()).get(COOKIE)?.value)
  if (!s) return null
  const u = leerUsuarios().find((x) => x.usuario === s.u)
  return u && u.activo ? publico(u) : null
}

export async function requerirUsuario(): Promise<UsuarioPublico> {
  const u = await usuarioActual()
  if (!u) redirect('/login')
  return u
}

export async function requerirAdmin(): Promise<UsuarioPublico> {
  const u = await requerirUsuario()
  if (u.rol !== 'admin') redirect('/')
  return u
}

export function validarPassword(p: string): string | null {
  if (p.length < 10) return 'La contraseña debe tener al menos 10 caracteres'
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'La contraseña debe combinar letras y números'
  return null
}

/** Qué puede ver un usuario: grupos, hoteles (null = todos los de sus grupos) y si ve las disponibilidades. */
export function permisos(u: Pick<Usuario, 'rol' | 'grupos' | 'hoteles' | 'disponibilidades' | 'secciones'>) {
  const todo = u.rol === 'admin' || u.rol === 'gerencia' || u.grupos.includes('*')
  return {
    todo,
    grupos: new Set(u.grupos),
    hoteles: !todo && u.hoteles?.length ? new Set(u.hoteles) : null,
    disponibilidades: todo || u.disponibilidades !== false,
  }
}

export function veHotel(u: Parameters<typeof permisos>[0], hotel: { id: string; grupo: string }) {
  const p = permisos(u)
  return p.todo || (p.grupos.has(hotel.grupo) && (!p.hoteles || p.hoteles.has(hotel.id)))
}

/** Solapas que ve el usuario, en el orden del menú. */
export function seccionesPermitidas(u: Parameters<typeof permisos>[0]): string[] {
  const p = permisos(u)
  return SECCIONES.map((x) => x.href as string).filter((href) => {
    if (u.rol === 'admin') return true
    if (u.secciones?.length && !u.secciones.includes(href)) return false
    if (href === '/disponibilidades' && !p.disponibilidades) return false
    if (href === '/paises' && !veHotel(u, { id: 'marriott', grupo: 'panatel' })) return false
    return true
  })
}
