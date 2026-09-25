import { type NextRequest, NextResponse } from 'next/server'

// Acceso con usuario y contraseña (HTTP Basic). Se activa definiendo APP_USUARIO y
// APP_PASSWORD en las variables de entorno del hosting. Sin ellas, la app queda abierta.
export function proxy(req: NextRequest) {
  const usuario = process.env.APP_USUARIO
  const clave = process.env.APP_PASSWORD
  if (!usuario || !clave) return NextResponse.next()
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Basic ')) {
    const [u, ...resto] = atob(auth.slice(6)).split(':')
    if (u === usuario && resto.join(':') === clave) return NextResponse.next()
  }
  return new NextResponse('Acceso restringido', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Gestion Hotelera", charset="UTF-8"' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
