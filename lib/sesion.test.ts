import assert from 'node:assert/strict'
import { test } from 'node:test'
import { crearToken, leerToken } from './sesion.ts'

test('sesión: token válido, alterado y vencido', () => {
  const t = crearToken('ceo.numah', 'cliente')
  const s = leerToken(t)
  assert.equal(s?.u, 'ceo.numah')
  assert.equal(s?.rol, 'cliente')
  // alguien intenta hacerse administrador cambiando el contenido
  const [, firma] = t.split('.')
  const falso = Buffer.from(JSON.stringify({ u: 'ceo.numah', rol: 'admin', exp: Date.now() + 1e6 })).toString('base64url')
  assert.equal(leerToken(`${falso}.${firma}`), null)
  assert.equal(leerToken('basura'), null)
  assert.equal(leerToken(undefined), null)
  const vencido = Buffer.from(JSON.stringify({ u: 'x', rol: 'admin', exp: Date.now() - 1 })).toString('base64url')
  assert.equal(leerToken(`${vencido}.${firma}`), null)
})
