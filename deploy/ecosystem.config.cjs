// PM2: mantiene la web app corriendo y la reinicia si se cae o si se reinicia el servidor.
const fs = require('fs')
const path = require('path')

const env = {}
const archivo = path.join(__dirname, '..', '.env')
if (fs.existsSync(archivo)) {
  for (const linea of fs.readFileSync(archivo, 'utf-8').split('\n')) {
    const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2]
  }
}

module.exports = {
  apps: [{
    name: 'gestion-hoteles',
    cwd: path.join(__dirname, '..'),
    script: 'node_modules/next/dist/bin/next',
    args: `start -p ${env.PORT || 3000}`,
    env,
    max_memory_restart: '600M',
  }],
}
