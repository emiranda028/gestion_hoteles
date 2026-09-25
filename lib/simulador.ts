// Modelo económico de un hotel (estructura USALI simplificada) y de la propuesta de
// gestión: cuánto cobra la operadora y cuánto gana el propietario.

export type Operacion = {
  habitaciones: number
  diasOperacion: number
  ocupacion: number // %
  adr: number
  aybPct: number // ingresos A&B como % de ingresos de habitaciones
  otrosPct: number // otros ingresos como % de ingresos de habitaciones
}

export type Costos = {
  costoHabPct: number // % de ingresos de habitaciones
  costoAybPct: number // % de ingresos de A&B
  costoOtrosPct: number // % de otros ingresos
  noDistribuidosPct: number // administración, comercial, mantenimiento, energía: % ingresos totales
  fijosAnuales: number // impuestos, seguros, alquileres a cargo del propietario
  reservaFfePct: number // reserva de reposición de mobiliario y equipos: % ingresos totales
}

export type Contrato = {
  feeBasePct: number // % de ingresos totales
  feeIncentivoPct: number // % del GOP
  feeMinimoMensual: number
  feeTecnologiaHabMes: number // sistemas, marketing digital, distribución: por habitación por mes
  feeInicial: number // transición / apertura, una sola vez
}

export type Mejora = {
  deltaOcc: number // pts de ocupación
  deltaAdr: number // % de tarifa
  ahorroNoDistribuidos: number // pts de ingresos totales
  rampa: number[] // % de la mejora alcanzado en cada año
  crecimientoAnual: number // % anual de tarifa y costos (en USD)
}

export type Alternativas = {
  feeFijoMensual: number
  rentaFijaAnual: number
  rentaVariablePct: number // % de ingresos totales
}

export type Entrada = {
  nombre: string
  moneda: 'USD' | 'ARS'
  operacion: Operacion
  costos: Costos
  contrato: Contrato
  mejora: Mejora
  alternativas: Alternativas
  anios: number
}

export type Resultado = {
  nochesDisponibles: number
  nochesVendidas: number
  ingHab: number
  ingAyb: number
  ingOtros: number
  ingTot: number
  costosDepartamentales: number
  beneficioDepartamental: number
  noDistribuidos: number
  gop: number
  gopMargen: number
  feeBase: number
  feeIncentivo: number
  feeTecnologia: number
  ajusteMinimo: number
  honorarios: number
  fijos: number
  reservaFfe: number
  noi: number // resultado neto para el propietario
  revpar: number
}

export function resultado(op: Operacion, c: Costos, contrato: Contrato | null, ahorro = 0): Resultado {
  const nochesDisponibles = op.habitaciones * op.diasOperacion
  const nochesVendidas = (nochesDisponibles * op.ocupacion) / 100
  const ingHab = nochesVendidas * op.adr
  const ingAyb = (ingHab * op.aybPct) / 100
  const ingOtros = (ingHab * op.otrosPct) / 100
  const ingTot = ingHab + ingAyb + ingOtros
  const costosDepartamentales =
    (ingHab * c.costoHabPct + ingAyb * c.costoAybPct + ingOtros * c.costoOtrosPct) / 100
  const beneficioDepartamental = ingTot - costosDepartamentales
  const noDistribuidos = (ingTot * Math.max(0, c.noDistribuidosPct - ahorro)) / 100
  const gop = beneficioDepartamental - noDistribuidos

  let feeBase = 0, feeIncentivo = 0, feeTecnologia = 0, ajusteMinimo = 0
  if (contrato) {
    feeBase = (ingTot * contrato.feeBasePct) / 100
    feeIncentivo = (Math.max(0, gop) * contrato.feeIncentivoPct) / 100
    feeTecnologia = contrato.feeTecnologiaHabMes * op.habitaciones * 12 * (op.diasOperacion / 365)
    const minimo = contrato.feeMinimoMensual * 12
    ajusteMinimo = Math.max(0, minimo - (feeBase + feeIncentivo + feeTecnologia))
  }
  const honorarios = feeBase + feeIncentivo + feeTecnologia + ajusteMinimo
  const reservaFfe = (ingTot * c.reservaFfePct) / 100
  const noi = gop - honorarios - c.fijosAnuales - reservaFfe
  return {
    nochesDisponibles,
    nochesVendidas,
    ingHab,
    ingAyb,
    ingOtros,
    ingTot,
    costosDepartamentales,
    beneficioDepartamental,
    noDistribuidos,
    gop,
    gopMargen: ingTot ? (100 * gop) / ingTot : 0,
    feeBase,
    feeIncentivo,
    feeTecnologia,
    ajusteMinimo,
    honorarios,
    fijos: c.fijosAnuales,
    reservaFfe,
    noi,
    revpar: nochesDisponibles ? ingHab / nochesDisponibles : 0,
  }
}

export function conMejora(op: Operacion, m: Mejora, avance = 1): Operacion {
  return {
    ...op,
    ocupacion: Math.min(100, Math.max(0, op.ocupacion + m.deltaOcc * avance)),
    adr: op.adr * (1 + (m.deltaAdr / 100) * avance),
  }
}

export type Anio = {
  anio: number
  actual: Resultado
  gestion: Resultado
  gananciaDueno: number // NOI con gestión - NOI actual (ya descontados los honorarios)
  acumuladoDueno: number
}

export function proyeccionAnual(e: Entrada): Anio[] {
  const filas: Anio[] = []
  let acumulado = -e.contrato.feeInicial
  for (let i = 0; i < e.anios; i++) {
    const g = Math.pow(1 + e.mejora.crecimientoAnual / 100, i)
    const base = { ...e.operacion, adr: e.operacion.adr * g }
    const costos = { ...e.costos, fijosAnuales: e.costos.fijosAnuales * g }
    const avance = (e.mejora.rampa[i] ?? e.mejora.rampa[e.mejora.rampa.length - 1] ?? 100) / 100
    const actual = resultado(base, costos, null)
    const gestion = resultado(conMejora(base, e.mejora, avance), costos, e.contrato, e.mejora.ahorroNoDistribuidos * avance)
    const ganancia = gestion.noi - actual.noi
    acumulado += ganancia
    filas.push({ anio: i + 1, actual, gestion, gananciaDueno: ganancia, acumuladoDueno: acumulado })
  }
  return filas
}

export type Modalidad = { id: string; nombre: string; ingresoOperadora: number; resultadoDueno: number; riesgo: string }

/** Compara, para el año 1 en régimen, quién gana cuánto según la modalidad de contrato. */
export function compararModalidades(e: Entrada): Modalidad[] {
  const op = conMejora(e.operacion, e.mejora, 1)
  const ahorro = e.mejora.ahorroNoDistribuidos
  const gestion = resultado(op, e.costos, e.contrato, ahorro)
  const sinFee = resultado(op, e.costos, null, ahorro)
  const feeFijo = e.alternativas.feeFijoMensual * 12
  const renta = e.alternativas.rentaFijaAnual + (sinFee.ingTot * e.alternativas.rentaVariablePct) / 100
  return [
    {
      id: 'gestion',
      nombre: 'Contrato de gestión (fee base + incentivo)',
      ingresoOperadora: gestion.honorarios,
      resultadoDueno: gestion.noi,
      riesgo: 'Compartido: el incentivo depende del GOP',
    },
    {
      id: 'fijo',
      nombre: 'Honorario fijo mensual',
      ingresoOperadora: feeFijo,
      resultadoDueno: sinFee.noi - feeFijo,
      riesgo: 'Todo del propietario',
    },
    {
      id: 'arriendo',
      nombre: 'Arrendamiento (renta fija + % de ingresos)',
      ingresoOperadora: sinFee.gop - renta,
      resultadoDueno: renta - sinFee.fijos - sinFee.reservaFfe,
      riesgo: 'Todo de la operadora',
    },
  ]
}

/** Matriz de sensibilidad del año en régimen: filas = delta ocupación, columnas = delta tarifa. */
export function sensibilidad(e: Entrada, dOcc: number[], dAdr: number[], metrica: 'honorarios' | 'noi' | 'gop') {
  const op = conMejora(e.operacion, e.mejora, 1)
  return dOcc.map((o) =>
    dAdr.map((a) => {
      const r = resultado(
        { ...op, ocupacion: Math.min(100, Math.max(0, op.ocupacion + o)), adr: op.adr * (1 + a / 100) },
        e.costos,
        e.contrato,
        e.mejora.ahorroNoDistribuidos,
      )
      return r[metrica]
    }),
  )
}

export const ENTRADA_INICIAL: Entrada = {
  nombre: 'Hotel prospecto',
  moneda: 'USD',
  operacion: { habitaciones: 80, diasOperacion: 365, ocupacion: 62, adr: 95, aybPct: 22, otrosPct: 4 },
  costos: {
    costoHabPct: 24,
    costoAybPct: 72,
    costoOtrosPct: 50,
    noDistribuidosPct: 24,
    fijosAnuales: 90000,
    reservaFfePct: 3,
  },
  contrato: { feeBasePct: 3, feeIncentivoPct: 8, feeMinimoMensual: 4000, feeTecnologiaHabMes: 6, feeInicial: 15000 },
  mejora: { deltaOcc: 8, deltaAdr: 10, ahorroNoDistribuidos: 3, rampa: [60, 90, 100, 100, 100], crecimientoAnual: 3 },
  alternativas: { feeFijoMensual: 9000, rentaFijaAnual: 250000, rentaVariablePct: 5 },
  anios: 5,
}
