# Puesta en marcha en Hostinger

La app necesita dos cosas corriendo en el servidor:

1. **La web app** (Node.js), que muestra los tableros y pide usuario y contraseña.
2. **La ingesta** (Python), que cada hora entra a Gmail, lee los adjuntos nuevos y actualiza los datos.
   La web app toma los datos nuevos sola, sin reiniciar.

Por eso se recomienda un **VPS de Hostinger** (KVM 1 alcanza; KVM 2 si van a sumar más hoteles),
con **Ubuntu 24.04**. Los planes de hosting compartido no permiten dejar corriendo Python y Node a la vez.

## 1. Gmail (una sola vez)

En la cuenta agencialtelc@gmail.com:
1. Activar la **verificación en dos pasos** (Cuenta de Google → Seguridad).
2. Crear una **contraseña de aplicación** (Seguridad → Contraseñas de aplicaciones) y guardarla: son 16 letras.
3. Gmail → Configuración → Ver toda la configuración → Reenvío y correo POP/IMAP → **Habilitar IMAP**.

No hace falta crear filtros: la ingesta mira **todos** los mails de los últimos 4 días con adjuntos
(bandeja de entrada, archivados y etiquetas), reconoce cada archivo por su contenido (Manager Flash,
H&F, Elite Arrivals, Auditoría de City Express, disponibilidades) e ignora el resto: por ejemplo los
reportes en pesos. Da igual cuántos mails lleguen por día o en qué orden. Cada mail procesado queda
con la etiqueta **Dashboard/Procesado** y no se vuelve a leer.

**Se pueden archivar, etiquetar o mover a otras carpetas** sin problema. Lo único: **no borrarlos**
hasta que tengan la etiqueta Dashboard/Procesado (pasa como máximo una hora después de llegar).
Si quieren la bandeja limpia, un filtro de Gmail puede mandarlos directo a una etiqueta
"Reportes hoteles" y sacarlos de la bandeja de entrada.

## 2. Preparar el VPS

Desde hPanel → VPS → Terminal (o por SSH):

```bash
sudo apt update && sudo apt install -y git python3-venv nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
```

## 3. Bajar el código

El código se guarda en GitHub (conviene que el repositorio sea **privado**) y el VPS lo baja de ahí.
Con el repositorio privado, el VPS necesita permiso de lectura: en el VPS correr
`ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519` y pegar el contenido de `~/.ssh/id_ed25519.pub` en
GitHub → el repositorio → Settings → Deploy keys → Add deploy key (solo lectura).

```bash
cd ~
git clone git@github.com:emiranda028/gestion_hoteles.git
cd gestion_hoteles
cp .env.example .env
nano .env        # completar: DATA_DIR, SESSION_SECRET, ADMIN_USUARIO, ADMIN_PASSWORD, GMAIL_*
```

Para `SESSION_SECRET` usar el resultado de `openssl rand -hex 32`.

## 4. Cargar los datos históricos

Subir `datos_iniciales.zip` al servidor (hPanel → Administrador de archivos, o `scp`) y:

```bash
mkdir -p /home/USUARIO/gestion_hoteles_datos           # la misma ruta que DATA_DIR
unzip datos_iniciales.zip -d /home/USUARIO/gestion_hoteles_datos
```

## 5. Instalar y arrancar

```bash
bash deploy/instalar.sh
```

Instala todo, compila, deja la app corriendo con PM2 (se levanta sola si el servidor se reinicia)
y programa la ingesta cada hora.

**Primera lectura del mail:** los datos iniciales llegan hasta el 25/09/2026. Para recuperar todo lo que
llegó después, la primera vez leer los mails de las últimas semanas (ajustar los días):

```bash
set -a; source .env; set +a
.venv/bin/python -m ingesta.run gmail --dias 45
```

Después, la ingesta automática de cada hora mira los últimos 4 días.

## 6. Dominio y HTTPS

Se recomienda un **subdominio** (p. ej. `hoteles.consultoraltelc.com`) y no una ruta
(`consultoraltelc.com/hoteles`): cada app queda independiente, se pueden sumar otras
(`bitacora.…`, `finanzas.…`) en el mismo VPS y la web institucional no se toca.

1. En hPanel → Dominios → DNS: un registro **A** para el subdominio apuntando a la IP del VPS.
2. En el VPS:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/gestion-hoteles
sudo nano /etc/nginx/sites-available/gestion-hoteles     # poner el dominio real
sudo ln -s /etc/nginx/sites-available/gestion-hoteles /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d hoteles.consultoraltelc.com
```

## 7. Usuarios

Entrar con `ADMIN_USUARIO` / `ADMIN_PASSWORD` y crear los usuarios en **Usuarios**:
- **Administrador LTELC**: ve todos los grupos, la página Datos y gestiona usuarios.
- **Cliente**: ve solo los hoteles de los grupos asignados (Panatel y/o Numah).

Cada usuario puede cambiar su contraseña desde su nombre, arriba a la derecha.

## Mantenimiento

- **Actualizar la app** cuando haya cambios: `cd ~/gestion_hoteles && git pull && bash deploy/instalar.sh`
- **Ver la última ingesta**: página **Datos** (errores de lectura y días faltantes) o `tail -f $DATA_DIR/ingesta.log`
- **Estado de la app**: `pm2 status` · **logs**: `pm2 logs gestion-hoteles`
- **Copia de seguridad**: alcanza con copiar la carpeta `DATA_DIR` (datos + usuarios).
