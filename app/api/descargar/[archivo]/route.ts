import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

// Descarga de los datos consolidados. Power BI puede conectarse a estas URLs
// (Obtener datos > Web) mientras conviva con la web app.
const ARCHIVOS: Record<string, string> = {
  'diario.csv': 'text/csv; charset=utf-8',
  'procedencia.csv': 'text/csv; charset=utf-8',
  'hoteles.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export function generateStaticParams() {
  return Object.keys(ARCHIVOS).map((archivo) => ({ archivo }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await params
  const tipo = ARCHIVOS[archivo]
  const ruta = path.join(process.cwd(), 'data', archivo)
  if (!tipo || !existsSync(ruta)) return new Response('No encontrado', { status: 404 })
  return new Response(readFileSync(ruta), {
    headers: { 'Content-Type': tipo, 'Content-Disposition': `attachment; filename="${archivo}"` },
  })
}
