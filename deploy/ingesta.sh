#!/usr/bin/env bash
# Lee los mails nuevos y actualiza los datos. Lo ejecuta el cron del servidor cada hora.
# La web app toma los datos nuevos sola (no hace falta reiniciarla).
set -uo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
mkdir -p "$DATA_DIR"

# evita dos ejecuciones al mismo tiempo
exec 9>"$DATA_DIR/.ingesta.lock"
flock -n 9 || { echo "ya hay una ingesta corriendo"; exit 0; }

echo "=== $(date '+%F %T') ==="
.venv/bin/python -m ingesta.run gmail
if [ -n "${PAISES_URL:-}" ]; then
  curl -fsSL "$PAISES_URL" -o "$DATA_DIR/.paises.xlsx" && .venv/bin/python -m ingesta.run paises "$DATA_DIR/.paises.xlsx"
fi
.venv/bin/python -m ingesta.tipo_cambio
