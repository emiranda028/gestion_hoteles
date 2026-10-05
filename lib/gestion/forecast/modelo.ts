// Módulo Forecast y Budget: ventas de habitaciones por código de mercado (Category › Segment › Código) y mes.
// Un archivo por hotel y año con sus capas: Budget, Real y Forecast (proyección de los meses abiertos).
// El "año anterior" es el Real del archivo del año previo; el "Budget del año próximo" es el Budget del archivo siguiente.

export type Codigo = { cat: string; seg: string; cod: string; desc: string }
export const clave = (c: Pick<Codigo, 'cat' | 'seg' | 'cod'>) => `${c.cat}|${c.seg}|${c.cod}`

export type Celda = [number, number] // [room nights, ADR en USD]
export type Capa = Record<string, (Celda | null)[]> // clave de código → 12 meses
export type CapaEditable = 'budget' | 'real' | 'forecast'

export type Version = { id: string; nombre: string; fecha: string; por: string; forecast: Capa }
export type Anio = {
  anio: number
  inventario: number[] // habitaciones disponibles por mes
  budget: Capa; real: Capa; forecast: Capa
  tcBudget: (number | null)[] // ARS por USD previsto en el Budget (los meses reales usan el BNA vendedor)
  importado: Partial<Record<CapaEditable, { archivo: string; fecha: string; por: string; codigos: number }>>
  versiones: Version[]
}

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
export const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const anioVacio = (anio: number, habitaciones: number): Anio => ({
  anio, inventario: Array(12).fill(habitaciones), budget: {}, real: {}, forecast: {}, tcBudget: Array(12).fill(null), importado: {}, versiones: [],
})
