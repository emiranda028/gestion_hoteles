/** Parser CSV mínimo (RFC 4180): comillas, comas y saltos de línea dentro de campos. */
export function parseCsv(texto: string): Record<string, string>[] {
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"'
        i++
      } else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === ',') {
      fila.push(campo)
      campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(campo)
      filas.push(fila)
      fila = []
      campo = ''
    } else campo += c
  }
  if (campo || fila.length) {
    fila.push(campo)
    filas.push(fila)
  }
  const [cab, ...resto] = filas.filter((f) => f.some((x) => x !== ''))
  if (!cab) return []
  return resto.map((f) => Object.fromEntries(cab.map((k, i) => [k.trim(), f[i] ?? ''])))
}
