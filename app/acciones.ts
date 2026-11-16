'use server'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { registrarIngreso } from '@/lib/actividad'
import { COOKIE, DURACION_HORAS, DURACION_RECORDAR_HORAS, crearToken } from '@/lib/sesion'
import {
  cambiarPassword, guardarUsuarios, leerUsuarios, nuevoUsuario, permisos, requerirAdmin, requerirUsuario, validarPassword,
  verificar, type Rol, type Usuario,
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
  registrarIngreso(u.usuario)
  const horas = form.get('recordar') === 'on' ? DURACION_RECORDAR_HORAS : DURACION_HORAS
  ;(await cookies()).set(COOKIE, crearToken(u.usuario, u.rol, horas), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: horas * 3600,
    // solo por https; COOKIE_SEGURA=false permite probar por http (con la IP) antes de tener dominio
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SEGURA !== 'false',
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
  const rol: Rol = form.get('rol') === 'admin' ? 'admin' : form.get('rol') === 'gerencia' ? 'gerencia' : 'cliente'
  const grupos = rol === 'cliente' ? form.getAll('grupos').map(String) : ['*']
  const soloAlgunos = rol === 'cliente' && form.get('alcance') === 'hoteles'
  const { cargarDatos } = await import('@/lib/datos')
  const delGrupo = new Map(cargarDatos().hoteles.map((h) => [h.id, h.grupo]))
  const hoteles = soloAlgunos ? form.getAll('hoteles').map(String).filter((h) => grupos.includes(delGrupo.get(h) ?? '')) : []
  const disponibilidades = rol !== 'cliente' || form.get('disponibilidades') === 'on'
  const { SECCIONES } = await import('@/lib/secciones')
  const elegidas = form.getAll('secciones').map(String).filter((x) => SECCIONES.some((s) => s.href === x))
  // todas marcadas = sin restricción (así las solapas nuevas que se agreguen también se ven)
  const secciones = rol === 'admin' || elegidas.length === SECCIONES.length ? undefined : elegidas
  const activo = form.get('activo') === 'on'
  const password = String(form.get('password') ?? '')
  const esNuevo = form.get('nuevo') === '1'

  if (!/^[a-z0-9._@-]{3,60}$/.test(usuario)) return { error: 'Usuario inválido: usá letras, números, punto, guion o un email.' }
  if (!nombre) return { error: 'Falta el nombre.' }
  if (rol === 'cliente' && grupos.length === 0) return { error: 'Elegí al menos un grupo de hoteles para el cliente.' }
  if (secciones && secciones.length === 0) return { error: 'Elegí al menos una solapa.' }
  if (soloAlgunos && hoteles.length === 0) return { error: 'Elegí al menos un hotel de los grupos marcados.' }
  if (esNuevo || password) {
    const e = validarPassword(password)
    if (e) return { error: e }
  }

  const lista = leerUsuarios()
  const i = lista.findIndex((x) => x.usuario === usuario)
  if (esNuevo) {
    if (i >= 0) return { error: 'Ya existe un usuario con ese nombre.' }
    lista.push(nuevoUsuario({ usuario, nombre, rol, grupos, hoteles, disponibilidades, secciones, activo }, password))
  } else {
    if (i < 0) return { error: 'El usuario no existe.' }
    if (usuario === admin.usuario && (rol !== 'admin' || !activo)) return { error: 'No podés quitarte el rol de administrador ni desactivarte.' }
    let u: Usuario = { ...lista[i], nombre, rol, grupos, hoteles, disponibilidades, secciones, activo }
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

/** Cuadro de disponibilidades (ARS / EUR / USD) de un grupo y fecha, solo si el usuario puede ver ese grupo. */
export async function verCuadroDisponibilidades(grupo: string, fecha: string) {
  const u = await requerirUsuario()
  const p = permisos(u)
  if (!p.disponibilidades || (!p.todo && !p.grupos.has(grupo))) return []
  const { cuadroDisponibilidades } = await import('@/lib/datos')
  return cuadroDisponibilidades(grupo, fecha)
}

export type EstadoFoto = { ok?: string; error?: string }

/** Sube (o reemplaza) la foto de un hotel para la portada del login. */
export type EstadoReporte = { error?: string; ok?: string; detalle?: string[] }

/** Carga a mano un reporte o planilla (PDF, Excel o ZIP) con el mismo proceso que los que llegan por mail. */
export async function subirReporte(_: EstadoReporte, form: FormData): Promise<EstadoReporte> {
  const u = await requerirAdmin()
  const archivo = form.get('archivo')
  if (!(archivo instanceof File) || !archivo.size) return { error: 'Elegí un archivo' }
  if (!/\.(pdf|xlsx|xlsm|zip)$/i.test(archivo.name)) return { error: 'El archivo tiene que ser PDF, Excel (.xlsx) o ZIP' }
  if (archivo.size > 15 * 1024 * 1024) return { error: 'El archivo pesa más de 15 MB' }
  const path = await import('node:path')
  const { mkdir, writeFile } = await import('node:fs/promises')
  const { existsSync } = await import('node:fs')
  const { execFile } = await import('node:child_process')
  const { DATA } = await import('@/lib/datos')
  const python = path.join(/*turbopackIgnore: true*/ process.cwd(), '.venv', 'bin', 'python')
  if (!existsSync(python)) return { error: 'Falta instalar la ingesta en el servidor (deploy/instalar.sh)' }
  // cada carga queda guardada en su propia carpeta, con fecha y usuario
  const sello = new Date().toISOString().replace(/[:.]/g, '-')
  const carpeta = path.join(/*turbopackIgnore: true*/ DATA, 'subidos', `${sello}-${u.usuario.replace(/[^a-z0-9._-]/gi, '_')}`)
  await mkdir(carpeta, { recursive: true })
  await writeFile(path.join(carpeta, path.basename(archivo.name).replace(/[^\w.\- ]/g, '_')), Buffer.from(await archivo.arrayBuffer()))
  const salida = await new Promise<{ codigo: number; texto: string }>((resolve) => {
    execFile(python, ['-m', 'ingesta.run', 'carpeta', carpeta], {
      cwd: process.cwd(), env: { ...process.env, DATA_DIR: DATA }, timeout: 180e3, maxBuffer: 4 * 1024 * 1024,
    }, (err, stdout, stderr) => resolve({ codigo: err ? 1 : 0, texto: `${stdout}\n${err ? stderr : ''}` }))
  })
  const lineas = salida.texto.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim())
  const resumen = lineas.filter((l) => /^\[(OK |ERR)\]|^\s+!|archivos procesados/.test(l))
  revalidatePath('/', 'layout')
  if (resumen.some((l) => l.includes('0 archivos procesados, 0 con error'))) {
    return { error: 'El archivo no es un reporte que use la app (o no se reconoció su formato).', detalle: resumen }
  }
  if (salida.codigo !== 0) return { error: 'Hubo un problema al procesar el archivo.', detalle: resumen.length ? resumen : lineas.slice(-8) }
  return { ok: 'Archivo cargado: la app ya muestra los datos nuevos.', detalle: resumen }
}

export async function guardarFotoPortada(_: EstadoFoto, form: FormData): Promise<EstadoFoto> {
  await requerirAdmin()
  const { HOTELES_PORTADA, CARPETA_PORTADA, rutaFoto } = await import('@/lib/portada')
  const hotel = String(form.get('hotel') ?? '')
  const archivo = form.get('foto')
  if (!HOTELES_PORTADA.some((h) => h.id === hotel)) return { error: 'Hotel desconocido' }
  if (!(archivo instanceof File) || !archivo.size) return { error: 'Elegí una foto' }
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return { error: 'La foto tiene que ser JPG, PNG o WEBP' }
  if (archivo.size > 15 * 1024 * 1024) return { error: 'La foto pesa más de 15 MB' }
  const { mkdir, writeFile } = await import('node:fs/promises')
  await mkdir(CARPETA_PORTADA, { recursive: true })
  let bytes: Buffer = Buffer.from(await archivo.arrayBuffer())
  try {
    // se achica y se pasa a JPG para que la portada cargue rápido también en el celular
    const sharp = (await import('sharp')).default
    bytes = await sharp(bytes).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true }).toBuffer()
  } catch {
    if (archivo.type !== 'image/jpeg') return { error: 'No se pudo convertir la foto: subila en JPG' }
  }
  await writeFile(rutaFoto(hotel), bytes)
  revalidatePath('/login')
  revalidatePath('/datos')
  return { ok: 'Foto guardada' }
}

export async function borrarFotoPortada(form: FormData) {
  await requerirAdmin()
  const { HOTELES_PORTADA, rutaFoto } = await import('@/lib/portada')
  const hotel = String(form.get('hotel') ?? '')
  if (!HOTELES_PORTADA.some((h) => h.id === hotel)) return
  const { rm } = await import('node:fs/promises')
  await rm(rutaFoto(hotel), { force: true })
  revalidatePath('/login')
  revalidatePath('/datos')
}
