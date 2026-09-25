'use server'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { COOKIE, DURACION_HORAS, crearToken } from '@/lib/sesion'
import {
  cambiarPassword, guardarUsuarios, leerUsuarios, nuevoUsuario, requerirAdmin, requerirUsuario, validarPassword,
  verificar, type Rol,
} from '@/lib/usuarios'

// Límite de intentos fallidos de ingreso: 8 cada 15 minutos por IP
const intentos = new Map<string, { n: number; desde: number }>()
const VENTANA = 15 * 60e3

async function ip() {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'local'
}

export type EstadoLogin = { error?: string; usuario?: string }

export async function iniciarSesion(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const clave = await ip()
  const reg = intentos.get(clave)
  if (reg && Date.now() - reg.desde < VENTANA && reg.n >= 8) {
    return { error: 'Demasiados intentos. Probá de nuevo en unos minutos.', usuario: String(form.get('usuario') ?? '') }
  }
  const usuario = String(form.get('usuario') ?? '')
  const password = String(form.get('password') ?? '')
  const u = verificar(usuario, password)
  if (!u) {
    const r = reg && Date.now() - reg.desde < VENTANA ? reg : { n: 0, desde: Date.now() }
    r.n++
    intentos.set(clave, r)
    return { error: 'Usuario o contraseña incorrectos.', usuario }
  }
  intentos.delete(clave)
  guardarUsuarios(leerUsuarios().map((x) => (x.usuario === u.usuario ? { ...x, ultimoIngreso: new Date().toISOString() } : x)))
  ;(await cookies()).set(COOKIE, crearToken(u.usuario, u.rol), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: DURACION_HORAS * 3600,
  })
  const volver = String(form.get('volver') ?? '/')
  redirect(volver.startsWith('/') && !volver.startsWith('//') ? volver : '/')
}

export async function cerrarSesion() {
  ;(await cookies()).delete(COOKIE)
  redirect('/login')
}

export type EstadoUsuario = { error?: string; ok?: string }

export async function guardarUsuario(_: EstadoUsuario, form: FormData): Promise<EstadoUsuario> {
  const admin = await requerirAdmin()
  const usuario = String(form.get('usuario') ?? '').trim().toLowerCase()
  const nombre = String(form.get('nombre') ?? '').trim()
  const rol = (form.get('rol') === 'admin' ? 'admin' : 'cliente') as Rol
  const grupos = rol === 'admin' ? ['*'] : form.getAll('grupos').map(String)
  const activo = form.get('activo') === 'on'
  const password = String(form.get('password') ?? '')
  const esNuevo = form.get('nuevo') === '1'

  if (!/^[a-z0-9._@-]{3,60}$/.test(usuario)) return { error: 'Usuario inválido: usá letras, números, punto, guion o un email.' }
  if (!nombre) return { error: 'Falta el nombre.' }
  if (rol === 'cliente' && grupos.length === 0) return { error: 'Elegí al menos un grupo de hoteles para el cliente.' }
  if (esNuevo || password) {
    const e = validarPassword(password)
    if (e) return { error: e }
  }

  const lista = leerUsuarios()
  const i = lista.findIndex((x) => x.usuario === usuario)
  if (esNuevo) {
    if (i >= 0) return { error: 'Ya existe un usuario con ese nombre.' }
    lista.push(nuevoUsuario({ usuario, nombre, rol, grupos, activo }, password))
  } else {
    if (i < 0) return { error: 'El usuario no existe.' }
    if (usuario === admin.usuario && (rol !== 'admin' || !activo)) return { error: 'No podés quitarte el rol de administrador ni desactivarte.' }
    let u = { ...lista[i], nombre, rol, grupos, activo }
    if (password) u = cambiarPassword(u, password)
    lista[i] = u
  }
  if (!lista.some((x) => x.rol === 'admin' && x.activo)) return { error: 'Tiene que quedar al menos un administrador activo.' }
  guardarUsuarios(lista)
  revalidatePath('/admin/usuarios')
  return { ok: esNuevo ? `Usuario ${usuario} creado.` : `Usuario ${usuario} actualizado.` }
}

export async function borrarUsuario(form: FormData) {
  const admin = await requerirAdmin()
  const usuario = String(form.get('usuario') ?? '')
  if (usuario === admin.usuario) return
  guardarUsuarios(leerUsuarios().filter((x) => x.usuario !== usuario))
  revalidatePath('/admin/usuarios')
}

export type EstadoPassword = { error?: string; ok?: string }

export async function cambiarMiPassword(_: EstadoPassword, form: FormData): Promise<EstadoPassword> {
  const yo = await requerirUsuario()
  const actual = String(form.get('actual') ?? ''), nueva = String(form.get('nueva') ?? '')
  if (!verificar(yo.usuario, actual)) return { error: 'La contraseña actual no es correcta.' }
  const e = validarPassword(nueva)
  if (e) return { error: e }
  guardarUsuarios(leerUsuarios().map((x) => (x.usuario === yo.usuario ? cambiarPassword(x, nueva) : x)))
  return { ok: 'Contraseña actualizada.' }
}
