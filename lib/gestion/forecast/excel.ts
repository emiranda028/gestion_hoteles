import 'server-only'
import ExcelJS from 'exceljs'
import type { Celda, Codigo } from './modelo'
import { clave } from './modelo'

// Formato de siempre: fila de títulos con "Market Category", luego Segment, Prefix ("código - descripción")
// y por cada mes tres columnas: RN, ADR y REVENUE (el revenue se recalcula como RN × ADR).

const texto = (v: unknown) => {
  if (v && typeof v === 'object' && 'result' in v) return String((v as { result: unknown }).result ?? '').trim()
  if (v && typeof v === 'object' && 'richText' in v) return (v as { richText: { text: string }[] }).richText.map((x) => x.text).join('').trim()
  return String(v ?? '').trim()
}
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v
  if (typeof v === 'object' && v && 'result' in v) return num((v as { result: unknown }).result)
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export async function leerBase(contenido: ArrayBuffer) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(contenido)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('El archivo no tiene hojas')
  const filas: unknown[][] = []
  ws.eachRow({ includeEmpty: false }, (row) => { filas.push((row.values as unknown[]).slice(1)) })
  let iTit = -1, cCat = -1
  for (let i = 0; i < Math.min(20, filas.length) && iTit < 0; i++) {
    const j = filas[i].findIndex((c) => texto(c).toLowerCase() === 'market category')
    if (j >= 0) { iTit = i; cCat = j }
  }
  if (iTit < 0) throw new Error('No encontré la fila de títulos con "Market Category". Usá la plantilla.')
  const codigos: Codigo[] = []
  const valores: Record<string, (Celda | null)[]> = {}
  for (const r of filas.slice(iTit + 1)) {
    const cat = texto(r[cCat]), seg = texto(r[cCat + 1]), pre = texto(r[cCat + 2])
    if (seg.toLowerCase() === 'total general') break
    if (!cat || !seg || !pre) continue
    const [cod, ...resto] = pre.split(' - ')
    const c: Codigo = { cat, seg, cod: cod.trim(), desc: (resto.join(' - ') || cod).trim() }
    const k = clave(c)
    codigos.push(c)
    valores[k] = Array.from({ length: 12 }, (_, m) => {
      const rn = num(r[cCat + 3 + 3 * m]), adr = num(r[cCat + 4 + 3 * m])
      return rn === null ? null : [rn, adr ?? 0] as Celda
    })
  }
  if (!codigos.length) throw new Error('No se encontraron códigos debajo de los títulos')
  return { codigos, valores }
}

export async function plantilla(estructura: Codigo[], valores: (k: string, m: number) => Celda | null, titulo: string) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Base')
  ws.addRow([titulo]).font = { bold: true, size: 12 }
  ws.addRow([])
  const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  const cab = ws.addRow(['Market Category', 'Market Segment', 'Market Prefix', ...meses.flatMap((m) => [`RN ${m}`, `ADR ${m}`, `REVENUE ${m}`])])
  cab.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  cab.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1C1C' } } })
  for (const c of estructura) {
    const k = clave(c)
    ws.addRow([c.cat, c.seg, `${c.cod} - ${c.desc}`, ...Array.from({ length: 12 }, (_, m) => {
      const v = valores(k, m)
      return v ? [v[0], v[1], Math.round(v[0] * v[1] * 100) / 100] : [null, null, null]
    }).flat()])
  }
  ws.addRow(['', 'Total general', ''])
  ws.getColumn(1).width = 16; ws.getColumn(2).width = 22; ws.getColumn(3).width = 34
  return Buffer.from(await wb.xlsx.writeBuffer())
}
