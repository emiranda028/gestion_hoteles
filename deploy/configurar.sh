#!/usr/bin/env bash
# Arma el archivo .env haciendo preguntas (no hace falta editarlo a mano).
# Uso: bash deploy/configurar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Configuración de Gestión Hotelera =="
read -rp "Usuario del administrador LTELC [admin@ltelc]: " ADMIN_USUARIO
ADMIN_USUARIO=${ADMIN_USUARIO:-admin@ltelc}
while true; do
  read -rsp "Contraseña del administrador (mín. 10, letras y números): " P1; echo
  read -rsp "Repetila: " P2; echo
  [[ "$P1" == "$P2" ]] || { echo "No coinciden, probá de nuevo."; continue; }
  [[ ${#P1} -ge 10 && "$P1" =~ [A-Za-z] && "$P1" =~ [0-9] ]] || { echo "Tiene que tener 10 caracteres o más, con letras y números."; continue; }
  break
done
read -rsp "Contraseña de APLICACIÓN de Gmail (16 letras; Enter para cargarla después): " GMAIL; echo
read -rp "URL de la planilla de países en Drive (Enter si no hay): " PAISES

DATA_DIR="$HOME/gestion_hoteles_datos"
mkdir -p "$DATA_DIR"
umask 077
cat > .env <<ENV
DATA_DIR=$DATA_DIR
SESSION_SECRET=$(openssl rand -hex 32)
ADMIN_USUARIO=$ADMIN_USUARIO
ADMIN_PASSWORD=$P1
GMAIL_USER=agencialtelc@gmail.com
GMAIL_APP_PASSWORD=${GMAIL// /}
PAISES_URL=$PAISES
# Mientras se entra por http://IP (sin https) queda en false; al activar el dominio con https se borra
COOKIE_SEGURA=false
PORT=3000
NODE_ENV=production
ENV
chmod 600 .env
echo "Listo: .env creado. Los datos van a vivir en $DATA_DIR"
