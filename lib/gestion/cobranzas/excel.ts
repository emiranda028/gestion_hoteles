import 'server-only'
import ExcelJS from 'exceljs'
import type { Factura } from './modelo'

// Lee la hoja DETALLE del informe de saldos del sistema contable (mismo archivo que se usaba hasta ahora).
// Busca la fila de títulos ("Código", "Nombre", "Fecha emisión", "Fecha vcto", "Prefijo", "Letra", "Número", "Moneda", "Saldo", "Cuota", "CUIT").

const iso = (v: unknown): string => {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number') return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10)
  const s = String(v ?? '').trim()
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''
}
const texto = (v: unknown) => {
  if (v && typeof v === 'object' && 'result' in v) return String((v as { result: unknown }).result ?? '').trim()
  if (v && typeof v === 'object' && 'text' in v) return String((v as { text: unknown }).text ?? '').trim()
  return String(v ?? '').trim()
}
const numero = (v: unknown) => {
  if (typeof v === 'number') return v
  const s = texto(v).replace(/\$/g, '').trim()
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s)
  return Number.isFinite(n) ? n : 0
}

export type Lectura = { facturas: Factura[]; nombres: Record<string, { nombre: string; cuit: string }>; hoja: string }

export async function leerDetalle(contenido: ArrayBuffer): Promise<Lectura> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(contenido)
  const ws = wb.getWorksheet('DETALLE') ?? wb.worksheets[0]
  if (!ws) throw new Error('El archivo no tiene hojas')
  const filas: unknown[][] = []
  ws.eachRow({ includeEmpty: false }, (row) => { filas.push((row.values as unknown[]).slice(1)) })
  const iTit = filas.slice(0, 15).findIndex((r) => r.some((c) => texto(c).toLowerCase().includes('código') || texto(c).toLowerCase() === 'codigo'))
  if (iTit < 0) throw new Error('No encontré la fila de títulos (falta la columna "Código"). ¿Es la hoja DETALLE?')
  const tit = filas[iTit].map((c) => texto(c).toLowerCase())
  const col = (...n: string[]) => tit.findIndex((h) => n.some((x) => h.includes(x)))
  const c = {
    cod: col('código', 'codigo'), nom: col('nombre', 'razón'), em: col('emisión', 'emision'), vto: col('vcto', 'vencimiento'),
    pre: col('prefijo'), let: col('letra'), num: col('número', 'numero'), mon: col('moneda'), sal: col('saldo'), cuo: col('cuota'), cuit: col('cuit'),
  }
  if (c.cod < 0 || c.sal < 0 || c.vto < 0) throw new Error('Faltan columnas obligatorias: Código, Fecha vcto y Saldo')
  const facturas: Factura[] = []
  const nombres: Lectura['nombres'] = {}
  const vistos = new Map<string, number>()
  for (const r of filas.slice(iTit + 1)) {
    const cod = texto(r[c.cod])
    if (!cod || !/\d/.test(cod)) continue
    const cliente = String(Number(cod) || cod)
    const saldo = numero(r[c.sal])
    const vence = iso(r[c.vto])
    if (!vence) continue
    const f: Factura = {
      id: '', cliente, emision: iso(r[c.em]) || vence, vence,
      prefijo: texto(r[c.pre]), letra: texto(r[c.let]), numero: texto(r[c.num]), cuota: texto(r[c.cuo]) || '1',
      moneda: texto(r[c.mon]) || '$', saldo,
    }
    const base = [cliente, f.prefijo, f.letra, f.numero, f.cuota].join('|')
    const n = (vistos.get(base) ?? 0) + 1 // comprobantes repetidos en el archivo: se conservan los dos
    vistos.set(base, n)
    f.id = n > 1 ? `${base}#${n}` : base
    facturas.push(f)
    if (!nombres[cliente]) nombres[cliente] = { nombre: texto(r[c.nom]), cuit: c.cuit >= 0 ? texto(r[c.cuit]) : '' }
  }
  if (!facturas.length) throw new Error('No se encontraron facturas en el archivo')
  return { facturas, nombres, hoja: ws.name }
}

/** Planilla simple con títulos en negrita, para descargar listados y estados de cuenta. */
export async function planilla(hojas: { nombre: string; titulo?: string[]; columnas: { t: string; ancho?: number; formato?: string }[]; filas: (string | number | null)[][] }[]) {
  const wb = new ExcelJS.Workbook()
  for (const h of hojas) {
    const ws = wb.addWorksheet(h.nombre.slice(0, 31))
    for (const t of h.titulo ?? []) ws.addRow([t]).font = { bold: true, size: 12 }
    if (h.titulo?.length) ws.addRow([])
    const cab = ws.addRow(h.columnas.map((x) => x.t))
    cab.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cab.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1C1C' } } })
    for (const f of h.filas) ws.addRow(f)
    h.columnas.forEach((x, i) => {
      const col = ws.getColumn(i + 1)
      col.width = x.ancho ?? 14
      if (x.formato) col.numFmt = x.formato
    })
  }
  return Buffer.from(await wb.xlsx.writeBuffer())
}
