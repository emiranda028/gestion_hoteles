import type { Factura } from './modelo.ts'

// Link al PDF de la factura en el portal del proveedor de facturación (convención de nombres por prefijo).
// Prefijos no mapeados: sin link.
const BASES: Record<string, { url: string; sigla: string; prefijos: number[] }> = {
  marriott: { url: 'https://factotumwebapp.com.ar/BUEMB/FactotumPDFs/', sigla: 'BUEMB', prefijos: [120, 121, 122] },
  'sheraton-bcr': { url: 'https://factotumwebapp.com.ar/BRCSI/FactotumPDFs/', sigla: 'BRCSI', prefijos: [125, 126] },
}

export function urlFactura(hotel: string, f: Factura): string | null {
  const b = BASES[hotel]
  const p = Number(f.prefijo), l = f.letra.toUpperCase()
  if (!b || !b.prefijos.includes(p) || !['A', 'B', 'T'].includes(l)) return null
  if (p === 122) return `${b.url}${b.sigla}FACTURAFCE_${l}${p}_${f.numero}.pdf`
  return `${b.url}${b.sigla}FACTURA${l}${p}_${f.numero}.pdf`
}
