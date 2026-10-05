import assert from 'node:assert/strict'
import { test } from 'node:test'
import { celda, diasMes, kpis, mesesConReal, proyectarMes, repartirEnteros, sumar } from './calculo.ts'
import { anioVacio } from './modelo.ts'

const a = anioVacio(2026, 100)
a.budget = { x: Array(12).fill([10, 100]), y: Array(12).fill([20, 50]) }
a.real = { x: [[12, 110], null, null, null, null, null, null, null, null, null, null, null] }
a.forecast = { y: [null, [25, 60], null, null, null, null, null, null, null, null, null, null] }
const cerrados = mesesConReal(a)

test('el Real manda en meses cerrados y los códigos sin venta valen cero', () => {
  assert.deepEqual(celda('forecast', 'x', 0, a, undefined, cerrados), [12, 110])
  assert.deepEqual(celda('forecast', 'y', 0, a, undefined, cerrados), [0, 0])
  assert.deepEqual(celda('forecast', 'y', 1, a, undefined, cerrados), [25, 60])
  assert.deepEqual(celda('forecast', 'x', 1, a, undefined, cerrados), [10, 100])
})

test('KPIs con ADR ponderado y ocupación sobre habitaciones disponibles', () => {
  const t = sumar(['x', 'y'], [1], 'forecast', a, undefined, cerrados, () => 1000)
  const k = kpis(t)
  assert.equal(t.rn, 35)
  assert.equal(k.revenue, 10 * 100 + 25 * 60)
  assert.equal(k.adr, (1000 + 1500) / 35)
  assert.equal(k.ocupacion, 35 / (100 * 28))
  assert.equal(kpis(t, 'ARS').revenue, 2500 * 1000)
})

test('el año anterior usa su real y, en los meses abiertos, su forecast', () => {
  const sig = anioVacio(2027, 100)
  assert.deepEqual(celda('anterior', 'x', 0, sig, a, []), [12, 110])
  assert.deepEqual(celda('anterior', 'y', 1, sig, a, []), [25, 60])
  assert.deepEqual(celda('anterior', 'x', 5, sig, a, []), [10, 100])
})

test('febrero bisiesto', () => {
  assert.equal(diasMes(2028, 1), 29)
  assert.equal(diasMes(2026, 1), 28)
})

test('reparto entero exacto y proyección que cierra el ingreso', () => {
  const r = repartirEnteros(10, [1, 1, 1])
  assert.equal(r.reduce((s, x) => s + x, 0), 10)
  const p = proyectarMes(['x', 'y'], (k) => (k === 'x' ? [10, 100] : [30, 50]), 80, 70)
  const rn = p.x[0] + p.y[0], rev = p.x[0] * p.x[1] + p.y[0] * p.y[1]
  assert.equal(rn, 80)
  assert.ok(Math.abs(rev - 80 * 70) < 5)
  const conCortesia = proyectarMes(['x', 'c'], (k) => (k === 'x' ? [90, 100] : [10, 0]), 100, 90)
  assert.equal(conCortesia.c[1], 0)
  assert.ok(Math.abs(conCortesia.x[0] * conCortesia.x[1] - 100 * 90) < 5)
})
