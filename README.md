# Gestión Hotelera

Reemplaza el proceso manual diario (bajar PDFs del mail → pasarlos a Excel → actualizar Power BI)
por un circuito automático que alimenta una web app propia.

```
Gmail (agencialtelc@gmail.com)
   │  todos los días, por hotel: zip con PDFs de Opera + Excel de disponibilidades por grupo
   ▼
GitHub Actions (3 veces por día) ── ingesta/ (Python)
   │  F116 Manager Flash ........ conceptos día / mes / año
   │  R106 History & Forecast ... un registro por día (historia y forecast) + foto del mes para el pick up
   │  J146 Elite Arrivals ....... llegadas Bonvoy por nivel
   │  Disponibilidades (xlsx) ... saldos de bancos, dólares, inversiones, cobros y pagos proyectados
   ▼
data/  hf.csv · flash.csv · pickup.csv · bonvoy.csv · disponibilidades.csv · bancos.csv · tipo_cambio.csv
       hoteles.xlsx (mismas columnas que la base de Power BI)
   ▼
Web app (Next.js)
   ├── Tablero ............. Manager Flash del día + ocupación, ADR, RevPAR, ingresos, Bonvoy, comparativo
   ├── Forecast y pick up .. on the books por mes, pick up diario y semanal, próximos 30/60/90 días
   ├── Disponibilidades .... saldos por grupo (Panatel, Numah), evolución y detalle por cuenta
   ├── Proyecciones ........ estacionalidad + tendencia, escenarios
   ├── Simulador ........... cuánto cobramos por operar un hotel y cuánto gana el propietario
   └── Datos ............... última ingesta, errores de lectura, días faltantes, descargas
```

**Moneda:** todo se trabaja en dólares (los reportes de Opera vienen en USD). El botón "ARS (BNA)"
convierte con el dólar Banco Nación vendedor de cada día. En disponibilidades, los saldos en pesos se
pasan a dólares con ese mismo tipo de cambio y los dólares se toman por su monto original.

**Hoteles:** Marriott Buenos Aires, Sheraton Mar del Plata y Sheraton Bariloche (grupo Panatel) y
City Express Palermo (grupo Numah). Maitei Posadas queda en el histórico. Se configuran en
`ingesta/config.yaml` (nombres tal como aparecen en Opera y en la base) y en `lib/datos.ts`.

> **Datos confidenciales.** Mientras el repositorio sea público, la carpeta `data/` (salvo `data/demo/`)
> no se sube y la app publicada muestra datos ficticios. La ingesta automática se niega a guardar datos
> si el repositorio es público. Pasarlo a privado: GitHub → Settings → General → Change visibility.

## 1. Puesta en marcha

### Gmail
1. En la cuenta `agencialtelc@gmail.com` activar la verificación en dos pasos.
2. Crear una **contraseña de aplicación** (Cuenta de Google → Seguridad → Contraseñas de aplicaciones).
3. Verificar que IMAP esté habilitado (Gmail → Configuración → Reenvío y correo POP/IMAP).

### GitHub
En el repositorio: *Settings → Secrets and variables → Actions → New repository secret*:

| Secreto | Valor |
|---|---|
| `GMAIL_USER` | `agencialtelc@gmail.com` |
| `GMAIL_APP_PASSWORD` | la contraseña de aplicación de 16 letras |

La ingesta corre sola a las 9:15, 12:15 y 18:15 (hora argentina). También se puede lanzar a mano
desde *Actions → Ingesta diaria de reportes → Run workflow*. Si un PDF no se puede leer, el job
queda en rojo y GitHub manda un mail; el detalle aparece en la página **Datos e ingesta**.

### Vercel (hosting de la web app)
1. Importar el repositorio en vercel.com (detecta Next.js solo).
2. Variables de entorno: `APP_USUARIO` y `APP_PASSWORD` para pedir usuario y contraseña al entrar.
   Opcional: `MONEDA_LOCAL` (por defecto `ARS`).
3. Cada vez que la ingesta guarda datos nuevos, Vercel vuelve a publicar la app.

## 2. Cargar el histórico (una sola vez)

```bash
python -m venv .venv && .venv/bin/pip install -r ingesta/requirements.txt
.venv/bin/python -m ingesta.run historico HF.xlsb          # base de Power BI: H&F, Flash, Pick up, Bonvoy, Disponibilidades
.venv/bin/python -m ingesta.run carpeta ./25.09 --fecha 2026-09-25   # una carpeta de reportes (zip, pdf, xlsx)
.venv/bin/python -m ingesta.tipo_cambio                    # dólar BNA vendedor
git add -f data/ && git commit -m "Carga inicial de datos" && git push   # SOLO con el repositorio privado
```

Para revisar qué se lee de un reporte: `.venv/bin/python -m ingesta.run inspeccionar "F116 25-09.pdf"`.

## 3. Controles

- La lectura se validó contra la base: el pick up coincide al centavo y el H&F coincide día por día
  (las únicas diferencias eran días en que la base tenía una versión anterior del reporte).
- Si llega un reporte de un hotel que no está configurado, un H&F en pesos, o un PDF que no se
  puede leer, queda registrado en **Datos** y el job de GitHub queda en rojo (llega un mail).
- Los PDF de auditoría y trial balance se ignoran (no alimentan tableros).

## 4. Power BI mientras conviven

`data/hoteles.xlsx` se regenera en cada ingesta con hojas H&F, Flash, Pick up, Bonvoy,
Disponibilidades y Tipo de cambio, con las mismas columnas que la base actual.

## 5. Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # cálculos de KPIs, proyecciones y simulador
npm run build
.venv/bin/python -m pytest -q ingesta   # lectura de PDFs
.venv/bin/python -m ingesta.demo        # regenera los datos de demostración
MUESTRAS_REALES=./reportes .venv/bin/python -m pytest ingesta   # prueba además con reportes reales locales
```

Mientras no exista `data/hf.csv`, la app muestra los datos de `data/demo/` con un aviso.

### Estructura
- `ingesta/` — Gmail (`gmail.py`), reportes de Opera (`opera.py`), planilla de disponibilidades
  (`disponibilidades.py`), clasificación y guardado (`procesar.py`, `almacen.py`), base histórica
  (`historico.py`), tipo de cambio (`tipo_cambio.py`), línea de comandos (`run.py`), configuración (`config.yaml`).
- `lib/` — cálculos: `kpi.ts`, `proyeccion.ts`, `simulador.ts`; carga de datos `datos.ts`.
- `components/` — pantallas: `Tablero`, `FlashDelDia`, `Pickup`, `Disponibilidades`, `Proyecciones`, `Simulador`.
- `app/` — rutas de Next.js.
