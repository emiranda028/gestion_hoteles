#!/usr/bin/env bash
# Instalación / actualización en el servidor (VPS de Hostinger con Ubuntu).
# Uso: bash deploy/instalar.sh   (desde la carpeta del proyecto, con el .env ya completado)
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "Falta el archivo .env (copiar .env.example y completarlo)"; exit 1; }
set -a; source .env; set +a

echo "» Dependencias de la ingesta (Python)"
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q -r ingesta/requirements.txt

echo "» Dependencias y compilación de la web app"
npm ci
npm run build

echo "» Arranque con PM2"
command -v pm2 >/dev/null || sudo npm install -g pm2
pm2 startOrReload deploy/ecosystem.config.cjs
pm2 save

echo "» Tarea programada: ingesta cada hora (minuto 10)"
LINEA="10 * * * * $(pwd)/deploy/ingesta.sh >> $DATA_DIR/ingesta.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'deploy/ingesta.sh' ; echo "$LINEA" ) | crontab -
echo "Listo. App en el puerto ${PORT:-3000}; configurar el dominio (ver deploy/HOSTINGER.md)."
