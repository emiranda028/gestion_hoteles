// Montos en pesos como los informa el sistema contable
export const pesos = (v: number) => `${v < 0 ? '-' : ''}$ ${Math.abs(Math.round(v)).toLocaleString('es-AR')}`
export const pesos2 = (v: number) => `${v < 0 ? '-' : ''}$ ${Math.abs(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const millones = (v: number) => (Math.abs(v) >= 1e6 ? `$ ${(v / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M` : pesos(v))
export const haceDias = (iso?: string) => {
  if (!iso) return null
  return Math.floor((Date.now() - Date.parse(iso)) / 864e5)
}
export const COLOR_TRAMO: Record<string, string> = {
  avencer: '#a3a3a3', d30: '#fcd34d', d60: '#f59e0b', d90: '#ea580c', d120: '#dc2626', dmas: '#7f1d1d',
}
