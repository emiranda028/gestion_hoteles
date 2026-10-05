import assert from 'node:assert/strict'
import { test } from 'node:test'
import { prioridad, resumirItems, resumirPrograma, semaforo } from './calculo.ts'
import type { Programa } from './modelo.ts'

const prog: Programa = {
  id: 't', nombre: 'Prueba', descripcion: '',
  escalas: [[{ t: 'Cumple', v: 100 }, { t: 'Parcial', v: 50 }, { t: 'No cumple', v: 0 }], [{ t: 'A', v: 20 }, { t: 'B', v: 20 }, { t: 'C', v: 60 }]],
  nodos: [
    { c: 'X', n: 'Área X', peso: 3, hijos: [{ c: 'X.1', n: 'Sub', items: [{ c: 'a', t: '', p: 2 }, { c: 'b', t: '', p: 1 }] }] },
    { c: 'Y', n: 'Área Y', items: [{ c: 'c', t: '', p: 1, e: 1, m: true }, { c: 'd', t: '', p: 4 }] },
  ],
}

test('el cumplimiento solo cuenta lo evaluado y la cobertura va aparte', () => {
  const r = resumirPrograma(prog, { a: { o: [0] } })
  assert.equal(r.cumplimiento, 1)
  assert.equal(r.respondidos, 1)
  assert.equal(r.cobertura, 1 / 4)
})

test('ponderado por peso, parciales y no aplica', () => {
  const r = resumirPrograma(prog, { a: { o: [1] }, b: { o: [0] }, d: { na: true } })
  assert.equal(r.cumplimiento, (0.5 * 2 + 1) / 3)
  assert.equal(r.aplicables, 3)
  assert.equal(r.noCumple, 0)
})

test('opción múltiple suma y "ninguna" vale cero', () => {
  const items = prog.nodos[1].items!
  assert.equal(resumirItems(prog, items, { c: { o: [0, 2] } }).cumplimiento, 0.8)
  const ninguna = resumirItems(prog, items, { c: { o: [] } })
  assert.equal(ninguna.cumplimiento, 0)
  assert.equal(ninguna.respondidos, 1)
})

test('semáforo y prioridad con los mismos cortes', () => {
  assert.equal(semaforo(0.9).texto, 'Excelente')
  assert.equal(semaforo(0.75).texto, 'Bueno')
  assert.equal(semaforo(0.6).texto, 'Aceptable')
  assert.equal(semaforo(0.2).texto, 'Crítico')
  assert.equal(semaforo(null).texto, 'Sin evaluar')
  assert.equal(prioridad(0.9), null)
  assert.equal(prioridad(0.4), 'Alta')
})
