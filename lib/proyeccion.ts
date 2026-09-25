// Proyección mensual por estacionalidad + tendencia, con escenarios.
import { type Dia, type Moneda, agregar, agrupar, diasDelMes, mesDe, sumarMeses } from './kpi.ts'

export type Escenario = { id: string; nombre: string; deltaOcc: number; deltaAdr: number; color: string }

export const ESCENARIOS_BASE: Escenario[] = [
  { id: 'pesimista', nombre: 'Pesimista', deltaOcc: -6, deltaAdr: -8, color: '#dc2626' },
  { id: 'base', nombre: 'Base', deltaOcc: 0, deltaAdr: 0, color: '#2563eb' },
  { id: 'optimista', nombre: 'Optimista', deltaOcc: 5, deltaAdr: 6, color: '#16a34a' },
]

export type MesHistorico = { mes: string; occ: number; adr: number; dispDia: number; ratioOtros: number; ingHab: number; ingTot: number }

export type MesProyectado = {
  mes: string
  escenario: string
  occ: number
  adr: number
  revpar: number
  nochesVendidas: number
  ingHab: number
  ingTot: number
}

export type Supuestos = {
  tendenciaOcc: number // pts por año
  crecimientoAdr: number // fracción anual
  ratioOtros: number // ingresos no-habitación / ingresos habitación
  dispDia: number // habitaciones disponibles promedio por día
}

export function historicoMensual(dias: Dia[], moneda: Moneda): MesHistorico[] {
  return [...agrupar(dias, (d) => mesDe(d.f)).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, ds]) => {
      const a = agregar(ds, moneda)
      return {
        mes,
        occ: a.occ,
        adr: a.adr,
        dispDia: a.dias ? a.disp / a.dias : 0,
        ratioOtros: a.ingHab ? (a.ingTot - a.ingHab) / a.ingHab : 0,
        ingHab: a.ingHab,
        ingTot: a.ingTot,
        dias: a.dias,
      }
    })
    // un mes con menos de 20 días de datos distorsiona la base de cálculo
    .filter((m) => m.dias >= 20 || m.mes === mesDe(dias[dias.length - 1]?.f ?? ''))
    .map(({ dias: _d, ...m }) => m)
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Estima tendencia comparando los últimos 12 meses completos contra los 12 anteriores. */
export function estimarSupuestos(hist: MesHistorico[]): Supuestos {
  const completos = hist.slice(0, -1).length >= 1 ? hist.slice(0, -1) : hist
  const ult = completos.slice(-12)
  const ant = completos.slice(-24, -12)
  const occ = (ms: MesHistorico[]) => promedio(ms.map((m) => m.occ))
  const adr = (ms: MesHistorico[]) => {
    const noches = ms.reduce((s, m) => s + (m.adr ? m.ingHab / m.adr : 0), 0)
    return noches ? ms.reduce((s, m) => s + m.ingHab, 0) / noches : 0
  }
  const comparable = ult.length === 12 && ant.length === 12
  const tendenciaOcc = comparable ? clamp((occ(ult) - occ(ant)) * 0.5, -5, 5) : 0
  const crecimientoAdr = comparable && adr(ant) ? clamp(adr(ult) / adr(ant) - 1, -0.3, 3) : 0
  const hab = ult.reduce((s, m) => s + m.ingHab, 0)
  const tot = ult.reduce((s, m) => s + m.ingTot, 0)
  return {
    tendenciaOcc: Math.round(tendenciaOcc * 10) / 10,
    crecimientoAdr: Math.round(crecimientoAdr * 1000) / 1000,
    ratioOtros: hab ? (tot - hab) / hab : 0,
    dispDia: promedio(hist.slice(-3).map((m) => m.dispDia)),
  }
}

/**
 * Para cada mes futuro toma el mismo mes del último año con datos (estacionalidad),
 * le aplica la tendencia y luego el ajuste del escenario.
 */
export function proyectar(
  hist: MesHistorico[],
  meses: number,
  escenarios: Escenario[],
  s: Supuestos,
): MesProyectado[] {
  if (!hist.length) return []
  const porMes = new Map(hist.map((m) => [m.mes, m]))
  const ultimo = hist[hist.length - 1].mes
  const occProm = promedio(hist.slice(-12).map((m) => m.occ))
  const adrProm = promedio(hist.slice(-12).map((m) => m.adr))
  const salida: MesProyectado[] = []
  for (let i = 1; i <= meses; i++) {
    const mes = sumarMeses(ultimo, i)
    // referencia: mismo mes hace 1, 2 o 3 años
    let ref: MesHistorico | undefined
    let anios = 0
    for (let k = 1; k <= 3 && !ref; k++) {
      ref = porMes.get(sumarMeses(mes, -12 * k))
      anios = k
    }
    const occBase = ref ? ref.occ + s.tendenciaOcc * anios : occProm
    const adrBase = ref ? ref.adr * Math.pow(1 + s.crecimientoAdr, anios) : adrProm * (1 + s.crecimientoAdr)
    const nochesDisp = s.dispDia * diasDelMes(mes)
    for (const e of escenarios) {
      const occ = clamp(occBase + e.deltaOcc, 0, 100)
      const adr = adrBase * (1 + e.deltaAdr / 100)
      const nochesVendidas = (nochesDisp * occ) / 100
      const ingHab = nochesVendidas * adr
      salida.push({
        mes,
        escenario: e.id,
        occ,
        adr,
        revpar: (occ / 100) * adr,
        nochesVendidas,
        ingHab,
        ingTot: ingHab * (1 + s.ratioOtros),
      })
    }
  }
  return salida
}
