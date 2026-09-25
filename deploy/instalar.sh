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
# --include=dev: para compilar hacen falta Tailwind y TypeScript aunque NODE_ENV=production
npm ci --include=dev
rm -rf .next   # compilación limpia (evita arrastrar errores de un intento anterior)
npm run build

echo "» Arranque con PM2"
command -v pm2 >/dev/null || npm install -g pm2
pm2 startOrReload deploy/ecosystem.config.cjs
pm2 save
# que la app vuelva a levantarse sola si se reinicia el servidor
pm2 startup systemd -u "$(whoami)" --hp "$HOME" >/dev/null || true

echo "» Tarea programada: ingesta cada hora (minuto 10)"
command -v crontab >/dev/null || apt-get install -y cron
LINEA="10 * * * * $(pwd)/deploy/ingesta.sh >> $DATA_DIR/ingesta.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'deploy/ingesta.sh' || true ; echo "$LINEA" ) | crontab -
crontab -l | grep -q 'deploy/ingesta.sh' && echo "  ok: la ingesta quedó programada"
echo "Listo. App en el puerto ${PORT:-3000}; configurar el dominio (ver deploy/HOSTINGER.md)."
