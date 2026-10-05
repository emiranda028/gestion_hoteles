export const entero = (v: number) => Math.round(v).toLocaleString('es-AR')
export const pct = (v: number) => `${(v * 100).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
export const pctPts = (v: number) => `${(v * 100).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts`
export function dinero(v: number, moneda: 'USD' | 'ARS', compacto = false) {
  const signo = moneda === 'USD' ? 'US$' : '$'
  const a = Math.abs(v), s = v < 0 ? '-' : ''
  if (compacto && a >= 1e6) return `${s}${signo} ${(a / 1e6).toLocaleString('es-AR', { maximumFractionDigits: a >= 1e8 ? 0 : 1 })} M`
  if (compacto && a >= 1e4) return `${s}${signo} ${(a / 1e3).toLocaleString('es-AR', { maximumFractionDigits: 0 })} k`
  return `${s}${signo} ${a.toLocaleString('es-AR', { maximumFractionDigits: a < 1000 ? 2 : 0, minimumFractionDigits: a < 1000 ? 2 : 0 })}`
}
