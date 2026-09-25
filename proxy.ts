import { type NextRequest, NextResponse } from 'next/server'
import { COOKIE, leerToken } from './lib/sesion'

// Todas las páginas requieren haber ingresado; /admin además requiere rol administrador.
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  if (pathname === '/login') return NextResponse.next()
  const sesion = leerToken(req.cookies.get(COOKIE)?.value)
  if (!sesion) {
    if (pathname.startsWith('/api/')) return new NextResponse('No autorizado', { status: 401 })
    const url = new URL('/login', req.url)
    if (pathname !== '/') url.searchParams.set('volver', pathname + search)
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith('/api/') && sesion.rol !== 'admin') return new NextResponse('Prohibido', { status: 403 })
  if ((pathname.startsWith('/admin') || pathname === '/datos') && sesion.rol !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)'],
}
