# Gestión Hotelera

Reemplaza el proceso manual diario (bajar PDFs del mail → pasarlos a Excel → actualizar Power BI)
por un circuito automático que alimenta una web app propia.

```
Gmail (agencialtelc@gmail.com)
   │  PDF de cada hotel, todos los días
   ▼
GitHub Actions (3 veces por día) ── ingesta/ (Python)
   │  lee el PDF, extrae indicadores, valida, guarda
   ▼
data/diario.csv · data/procedencia.csv · data/hoteles.xlsx · data/tipo_cambio.csv
   │  commit automático
   ▼
Vercel redeploya la web app (Next.js)
   ├── Tablero ........... ocupación, ADR, RevPAR, ingresos, procedencia, comparativo por hotel
   ├── Proyecciones ...... estacionalidad + tendencia, escenarios pesimista / base / optimista
   ├── Simulador ......... cuánto cobramos por operar un hotel y cuánto gana el propietario
   └── Datos e ingesta ... última ejecución, errores de lectura, días faltantes, descargas
```

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

## 2. Adaptar la lectura a los PDF reales

Todo lo que depende del formato está en `ingesta/config.yaml`: los hoteles (con los textos que los
identifican) y los patrones para encontrar cada dato. Para ver qué sale de un PDF:

```bash
python -m venv .venv && .venv/bin/pip install -r ingesta/requirements.txt
.venv/bin/python -m ingesta.run inspeccionar reporte.pdf
```

Muestra el texto extraído, el hotel, la fecha y cada campo reconocido. Si falta algo, se ajusta
el patrón en `config.yaml` y se vuelve a probar. Si cada hotel usa un sistema distinto, se agrega
una plantilla por formato.

Campos que se extraen por hotel y día: habitaciones disponibles, ocupadas y fuera de servicio,
huéspedes, llegadas, salidas, ocupación, ADR, ingresos de habitaciones, de A&B, otros y totales,
y la procedencia de los huéspedes por país. Los que falten se calculan cuando se puede (por ejemplo,
los ingresos de habitaciones a partir de las noches vendidas y el ADR) y se controlan las
incoherencias (ocupadas > disponibles, ADR informado distinto del calculado).

## 3. Cargar el histórico

```bash
# El Excel que hoy alimenta Power BI (reconoce las columnas por nombre)
.venv/bin/python -m ingesta.run excel historico.xlsx --hoja "Hoja1"
# Si el Excel es de un solo hotel:
.venv/bin/python -m ingesta.run excel historico_hotel.xlsx --hotel hotel-demo-1

# Una carpeta con PDFs viejos
.venv/bin/python -m ingesta.run carpeta ./pdfs_2025
```

Después: commit y push de la carpeta `data/`.

## 4. Power BI mientras conviven

`data/hoteles.xlsx` se regenera en cada ingesta con las hojas *Diario* y *Procedencia*. Los
tableros actuales pueden leerlo en lugar del Excel armado a mano (y también se descarga desde
**Datos e ingesta**).

## 5. Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # cálculos de KPIs, proyecciones y simulador
npm run build
.venv/bin/python -m pytest -q ingesta   # lectura de PDFs
.venv/bin/python -m ingesta.demo        # regenera los datos de demostración
```

Mientras `data/diario.csv` no tenga datos, la app muestra los de `data/demo/` con un aviso.

### Estructura
- `ingesta/` — descarga de Gmail (`gmail.py`), lectura de PDF (`parser.py`), guardado (`almacen.py`),
  línea de comandos (`run.py`), tipo de cambio (`tipo_cambio.py`), configuración (`config.yaml`).
- `lib/` — cálculos: `kpi.ts`, `proyeccion.ts`, `simulador.ts`; carga de datos `datos.ts`.
- `components/` — pantallas: `Tablero`, `Proyecciones`, `Simulador`.
- `app/` — rutas de Next.js.
