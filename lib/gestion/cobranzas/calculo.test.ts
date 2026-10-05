import assert from 'node:assert/strict'
import { test } from 'node:test'
import { antiguedad, destino, prevision, semanas, tramo } from './calculo.ts'
import type { Factura } from './modelo.ts'

const f = (id: string, vence: string, saldo: number): Factura =>
  ({ id, cliente: '1', emision: '2026-01-01', vence, prefijo: '121', letra: 'A', numero: id, cuota: '1', moneda: '$', saldo })
const corte = '2026-09-28'

test('tramos con cortes claros: 1-30, 31-60…', () => {
  assert.equal(tramo(f('a', '2026-09-28', 1), corte), 'avencer')
  assert.equal(tramo(f('a', '2026-09-27', 1), corte), 'd30')
  assert.equal(tramo(f('a', '2026-08-29', 1), corte), 'd30')
  assert.equal(tramo(f('a', '2026-08-28', 1), corte), 'd60')
  assert.equal(tramo(f('a', '2026-05-01', 1), corte), 'dmas')
})

test('antigüedad suma tramos, vencido y notas de crédito', () => {
  const r = antiguedad([f('a', '2026-10-10', 100), f('b', '2026-09-01', 50), f('c', '2026-06-01', -20)], corte)
  assert.equal(r.total, 130)
  assert.equal(r.vencido, 30)
  assert.equal(r.avencer, 100)
  assert.equal(r.mas90, -20)
})

test('previsión: vencida sin fecha no se inventa, la fecha cargada manda', () => {
  assert.equal(destino(f('a', '2026-09-01', 1), corte), 'sinFecha')
  assert.equal(destino(f('a', '2026-09-01', 1), corte, '2026-10-02'), 0)
  assert.equal(destino(f('a', '2026-09-01', 1), corte, '2026-09-20'), 'atrasada')
  assert.equal(destino(f('a', '2026-10-06', 1), corte), 1)
  assert.equal(destino(f('a', '2026-12-30', 1), corte), 'despues')
  const p = prevision([f('a', '2026-10-01', 10), f('b', '2026-09-01', 5), f('c', '2026-09-01', -2)], corte, { c: '2026-10-01' })
  assert.deepEqual(p.semanas, [8, 0, 0, 0, 0])
  assert.equal(p.sinFecha, 5)
  assert.equal(p.total, 13)
  assert.equal(semanas(corte)[0].desde, '2026-09-29')
})
