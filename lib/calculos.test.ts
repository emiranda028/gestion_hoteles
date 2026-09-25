import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseCsv } from './csv.ts'
import { type Dia, agregar, anioAnterior, sumarMeses } from './kpi.ts'
import { estimarSupuestos, historicoMensual, proyectar } from './proyeccion.ts'
import { ENTRADA_INICIAL, compararModalidades, proyeccionAnual, resultado } from './simulador.ts'

const dia = (f: string, disp: number, ocup: number, ingHab: number, tc = 1000): Dia =>
  ({ f, h: 'h1', disp, ocup, pax: ocup * 2, ingHab, ingAyb: 0, ingOtros: 0, ingTot: ingHab, tc })

test('KPIs ponderados, no promedio de promedios', () => {
  const a = agregar([dia('2026-01-01', 100, 50, 5000), dia('2026-01-02', 100, 100, 20000)])
  assert.equal(a.occ, 75)
  assert.equal(a.adr, 25000 / 150)
  assert.equal(a.revpar, 25000 / 200)
  const ars = agregar([dia('2026-01-01', 100, 50, 50, 1000)], 'ars')
  assert.equal(ars.ingHab, 50000)
})

test('fechas', () => {
  assert.equal(anioAnterior('2024-02-29'), '2023-02-28')
  assert.equal(sumarMeses('2026-11', 3), '2027-02')
  assert.equal(sumarMeses('2026-01', -1), '2025-12')
})

test('csv con comillas', () => {
  const r = parseCsv('a,b\n"Hotel, Centro","x ""y"""\n')
  assert.deepEqual(r, [{ a: 'Hotel, Centro', b: 'x "y"' }])
})

test('proyección repite estacionalidad con tendencia cero', () => {
  const dias: Dia[] = []
  for (let m = 0; m < 25; m++) {
    const mes = sumarMeses('2024-01', m)
    const occ = mes.endsWith('-01') ? 90 : 50
    for (let d = 1; d <= 28; d++) dias.push(dia(`${mes}-${String(d).padStart(2, '0')}`, 100, occ, occ * 100))
  }
  const hist = historicoMensual(dias, 'usd')
  const s = estimarSupuestos(hist)
  assert.equal(s.tendenciaOcc, 0)
  const p = proyectar(hist, 12, [{ id: 'b', nombre: 'B', deltaOcc: 0, deltaAdr: 0, color: '' }], s)
  assert.equal(p.find((x) => x.mes === '2026-02')?.occ, 50)
  assert.equal(p.find((x) => x.mes === '2027-01')?.occ, 90)
})

test('simulador: resultado y honorarios', () => {
  const e = ENTRADA_INICIAL
  const sin = resultado(e.operacion, e.costos, null)
  assert.equal(sin.honorarios, 0)
  assert.equal(sin.ingTot, sin.ingHab + sin.ingAyb + sin.ingOtros)
  const con = resultado(e.operacion, e.costos, e.contrato)
  assert.ok(Math.abs(con.noi - (sin.noi - con.honorarios)) < 1e-6)
  const minimo = resultado({ ...e.operacion, ocupacion: 1 }, e.costos, e.contrato)
  assert.ok(Math.abs(minimo.honorarios - e.contrato.feeMinimoMensual * 12) < 1e-6)
  const anios = proyeccionAnual(e)
  assert.equal(anios.length, 5)
  assert.ok(anios[2].gananciaDueno > anios[0].gananciaDueno)
  assert.equal(compararModalidades(e).length, 3)
})
