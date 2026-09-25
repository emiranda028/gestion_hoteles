import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { DATA } from '@/lib/datos'

// Descarga de los datos consolidados. Power BI puede conectarse a estas URLs
// (Obtener datos > Web) mientras conviva con la web app.
const ARCHIVOS: Record<string, string> = {
  'hf.csv': 'text/csv; charset=utf-8',
  'flash.csv': 'text/csv; charset=utf-8',
  'pickup.csv': 'text/csv; charset=utf-8',
  'disponibilidades.csv': 'text/csv; charset=utf-8',
  'tipo_cambio.csv': 'text/csv; charset=utf-8',
  'paises.csv': 'text/csv; charset=utf-8',
  'hoteles.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export async function GET(_req: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await params
  const tipo = ARCHIVOS[archivo]
  const ruta = path.join(DATA, archivo)
  if (!tipo || !existsSync(ruta)) return new Response('No encontrado', { status: 404 })
  return new Response(readFileSync(ruta), {
    headers: { 'Content-Type': tipo, 'Content-Disposition': `attachment; filename="${archivo}"` },
  })
}
