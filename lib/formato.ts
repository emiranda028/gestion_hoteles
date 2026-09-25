const nf = (dec: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

export const entero = (n: number) => nf(0).format(Math.round(n))
export const decimal = (n: number, d = 1) => nf(d).format(n)
export const pct = (n: number, d = 1) => `${nf(d).format(n)}%`

export function dinero(n: number, moneda: 'local' | 'usd' | 'USD' | 'ARS' = 'local', compacto = false) {
  const simbolo = moneda === 'usd' || moneda === 'USD' ? 'US$' : '$'
  if (compacto) {
    const abs = Math.abs(n)
    if (abs >= 1e9) return `${simbolo} ${nf(1).format(n / 1e9)} mil M`
    if (abs >= 1e6) return `${simbolo} ${nf(1).format(n / 1e6)} M`
    if (abs >= 1e4) return `${simbolo} ${nf(0).format(n / 1e3)} k`
  }
  return `${simbolo} ${nf(0).format(Math.round(n))}`
}

export function variacionTexto(v: number | null, puntos = false) {
  if (v === null || !Number.isFinite(v)) return '—'
  const s = v > 0 ? '+' : ''
  return puntos ? `${s}${nf(1).format(v)} pts` : `${s}${nf(1).format(v * 100)}%`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const mesCorto = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(2, 4)}`
export const fechaCorta = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`
export const fechaLarga = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`

export const bandera = (iso2: string) =>
  iso2 && iso2.length === 2
    ? String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
    : '🏳️'
