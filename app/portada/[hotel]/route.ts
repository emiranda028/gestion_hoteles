import { readFile } from 'node:fs/promises'
import { HOTELES_PORTADA, rutaFoto } from '@/lib/portada'

// Público (se ve antes de ingresar): solo las fotos de la portada, nada de datos
export async function GET(_: Request, { params }: { params: Promise<{ hotel: string }> }) {
  const { hotel } = await params
  if (!HOTELES_PORTADA.some((h) => h.id === hotel)) return new Response('No encontrado', { status: 404 })
  try {
    const foto = await readFile(rutaFoto(hotel))
    return new Response(foto, {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  } catch {
    return new Response('No encontrado', { status: 404 })
  }
}
