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
   ├── Resumen ............. resumen ejecutivo comparado por grupo (como la primera hoja de Power BI)
   ├── Manager Flash ....... día / mes / año por hotel, ventas por rubro, ADR, RevPar, últimos 30 días
   ├── H&F ................. ocupación real y proyectada del mes, detalle del día, detalle diario con semáforos
   ├── Por país ............ globo terráqueo, ranking con banderas, argentinos vs extranjeros, mercados que crecen
   ├── Tablero ............. Manager Flash del día + ocupación, ADR, RevPAR, ingresos, Bonvoy, países, comparativo
   ├── Forecast y pick up .. on the books por mes, pick up diario y semanal, próximos 30/60/90 días
   ├── Disponibilidades .... saldos por grupo (Panatel, Numah) tal como los informan, evolución y detalle
   ├── Proyecciones ........ estacionalidad + tendencia, escenarios
   ├── Simulador ........... cuánto cobramos por operar un hotel y cuánto gana el propietario
   └── Datos ............... última ingesta, errores de lectura, días faltantes, descargas
```

**Moneda:** los indicadores de los hoteles se trabajan siempre en dólares (así vienen hoy los reportes
de Opera). El botón "ARS (BNA)" los muestra en pesos con el dólar Banco Nación vendedor de cada día.
Los registros viejos que la base tiene en pesos (de cuando los hoteles informaban en pesos) se pasan a
dólares automáticamente con el BNA del día (`ingesta/normalizar.py`).
**Disponibilidades** se muestran tal cual las manda cada grupo: pesos en pesos, dólares y euros en su
moneda, y con el tipo de cambio que informa el grupo.

**Huéspedes por país:** solo Marriott Buenos Aires, desde la planilla "Venta x PAIS" de Drive
(`python -m ingesta.run paises archivo.xlsx`, o automático con la variable `PAISES_URL`, ver abajo).

**Hoteles:** Marriott Buenos Aires, Sheraton Mar del Plata y Sheraton Bariloche (grupo Panatel) y
City Express Palermo (grupo Numah). Maitei Posadas ya no pertenece al grupo: sus datos quedan como
histórico y no suman en "Todos los hoteles". Se configuran en
`ingesta/config.yaml` (nombres tal como aparecen en Opera y en la base) y en `lib/datos.ts`.

> **Datos confidenciales.** Los datos reales viven solo en el servidor (carpeta `DATA_DIR`) y nunca
> se suben a GitHub; el repositorio lleva solo el código y datos ficticios de demostración (`data/demo/`).

## 1. Puesta en marcha

La app se instala en un VPS de Hostinger: ver **[deploy/HOSTINGER.md](deploy/HOSTINGER.md)**
(Gmail, servidor, datos iniciales, dominio, HTTPS y usuarios). La ingesta corre cada hora en el
servidor y la web app muestra los datos nuevos sin reiniciarse.

**Acceso:** usuario y contraseña. Los administradores de LTELC crean los usuarios desde
**Usuarios** y asignan a cada cliente los grupos de hoteles que puede ver.

## 2. Cargar el histórico (una sola vez)

```bash
python -m venv .venv && .venv/bin/pip install -r ingesta/requirements.txt
.venv/bin/python -m ingesta.run historico HF.xlsb          # base de Power BI: H&F, Flash, Pick up, Bonvoy, Disponibilidades
.venv/bin/python -m ingesta.run carpeta ./25.09 --fecha 2026-09-25   # una carpeta de reportes (zip, pdf, xlsx)
.venv/bin/python -m ingesta.tipo_cambio                    # dólar BNA vendedor
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
