"""Huéspedes por país de origen (solo Marriott Buenos Aires).

Se lee de la planilla "Venta x PAIS" que se descarga de Drive. Acepta dos formatos:
  - una hoja con columnas Continente / Año / PAÍS / Mes / N° Mes / Importe (huéspedes), o
  - una hoja por año ("Pais 2026", "Pais Origen 2025", ...) con un país por fila y los meses en columnas
    (ENE, %, FEB, %, ...), con la región en la primera columna (EU / AM / ASIA / RESTO).

    python -m ingesta.run paises Venta_x_PAIS_BS_AS.xlsx
"""
from __future__ import annotations

import io
import unicodedata

from . import almacen

COLS = ["hotel", "mes", "pais", "continente", "huespedes"]
HOTEL = "marriott"


def _norm(v) -> str:
    t = unicodedata.normalize("NFKD", str(v or "")).encode("ascii", "ignore").decode()
    return " ".join(t.upper().replace("°", "").split())


MESES = {"ENE": 1, "JAN": 1, "FEB": 2, "MAR": 3, "ABR": 4, "APR": 4, "MAY": 5, "JUN": 6, "JUL": 7, "AGO": 8, "AUG": 8,
         "SEP": 9, "SET": 9, "OCT": 10, "NOV": 11, "DIC": 12, "DEC": 12}
REGIONES = {"EU": "EUROPA", "EUROPA": "EUROPA", "AM": "AMÉRICA", "AMERICA": "AMÉRICA", "ASIA": "ASIA",
            "OCEANIA": "OCEANÍA", "AFRICA": "ÁFRICA"}
# «RESTO» agrupa Oceanía, África y otros: se ubica cada país en su continente
RESTO = {"AUSTRALIA": "OCEANÍA", "NUEVA ZELANDA": "OCEANÍA", "EGIPTO": "ÁFRICA", "KENIA": "ÁFRICA", "AFRICA": "ÁFRICA",
         "SUDAFRICA": "ÁFRICA", "MARRUECOS": "ÁFRICA", "NIGERIA": "ÁFRICA"}
# La planilla mezcla nombres en castellano e inglés y tiene errores de tipeo: se lleva todo al nombre en castellano
ALIAS = {
    "AANDORRA": "ANDORRA", "BELGIUM": "BELGICA", "BRAZIL": "BRASIL", "CATAR": "QATAR", "CROATIA": "CROACIA",
    "CZECH REPUBLIC": "REPUBLICA CHECA", "DENMARK": "DINAMARCA", "DOMINICAN REPUBLIC": "REPUBLICA DOMINICANA",
    "EGYPT": "EGIPTO", "FINLAND": "FINLANDIA", "FRANCE": "FRANCIA", "GERMANY": "ALEMANIA", "GRAN BRETANIA": "GRAN BRETANA",
    "GREECE": "GRECIA", "HUNGARY": "HUNGRIA", "ICELAND": "ISLANDIA", "INGLATERA": "INGLATERRA", "IRELAND": "IRLANDA",
    "ISLAS CAIMANES": "ISLAS CAIMAN", "ITALY": "ITALIA", "JAPAN": "JAPON", "KENYA": "KENIA", "KOREA (SOUTH)": "COREA DEL SUR",
    "LATVIA": "LETONIA", "LUXEMBOURG": "LUXEMBURGO", "MALAYSIA": "MALASIA", "NETHERLANDS": "HOLANDA",
    "NEW ZEALAND": "NUEVA ZELANDA", "NORWAY": "NORUEGA", "PHILIPPINES": "FILIPINAS", "POLAND": "POLONIA",
    "REINO UNIDO": "GRAN BRETANA", "UNITED KINGDOM": "GRAN BRETANA", "RUSSIAN FEDERATION": "RUSIA",
    "SINGAPORE": "SINGAPUR", "SLOVAKIA": "ESLOVAQUIA", "SLOVENIA": "ESLOVENIA", "SPAIN": "ESPANA", "SWEDEN": "SUECIA",
    "SWITZELAND": "SUIZA", "SWITZERLAND": "SUIZA", "SUECIA (SWITZELAND)": "SUIZA", "SYRIA": "SIRIA",
    "TAIWAN PROVINCE": "TAIWAN", "TRINIDAD AND TOBAGO": "TRINIDAD Y TOBAGO", "TURKEY": "TURQUIA", "UKRAINE": "UCRANIA",
    "UNITED ARAB EMIRATES": "EMIRATOS ARABES", "UNITED STATES": "ESTADOS UNIDOS",
}


def _pais(v) -> str:
    n = _norm(v)
    return ALIAS.get(n, n)


def _hojas_por_anio(wb):
    """Hojas «Pais 2026» / «Pais Origen 2025»: fila de títulos con PAIS y los meses."""
    import re

    for ws in wb.worksheets:
        m = re.search(r"(20\d\d)", ws.title)
        if not m or "PAIS" not in _norm(ws.title):
            continue
        for i, fila in enumerate(ws.iter_rows(min_row=1, max_row=5, values_only=True)):
            cab = [_norm(c) for c in fila]
            if "PAIS" in cab and any(c[:3] in MESES and len(c) <= 10 for c in cab):
                yield ws, int(m[1]), i, cab
                break


def _leer_por_anio(wb) -> list[dict]:
    hojas = list(_hojas_por_anio(wb))
    # región de cada país según las hojas que la traen (las de 2018 y 2019 no tienen esa columna)
    region: dict[str, str] = {}
    for ws, _, h, cab in hojas:
        i_pais = cab.index("PAIS")
        if i_pais == 0:
            continue
        for f in list(ws.iter_rows(values_only=True))[h + 1:]:
            p, reg = _pais(f[i_pais]), _norm(f[0])
            if p and reg:
                region[p] = RESTO.get(p, "SIN REFERENCIA") if reg == "RESTO" else REGIONES.get(reg, "SIN REFERENCIA")
    total: dict[tuple, dict] = {}
    for ws, anio, h, cab in hojas:
        i_pais = cab.index("PAIS")
        # columnas de cada mes: solo las primeras 12 (después vienen TOTAL y un ranking)
        meses = []
        for j, c in enumerate(cab):
            if j > i_pais and c[:3] in MESES and len(c) <= 10 and MESES[c[:3]] not in [m for m, _ in meses]:
                meses.append((MESES[c[:3]], j))
        for f in list(ws.iter_rows(values_only=True))[h + 1:]:
            p = _pais(f[i_pais]) if i_pais < len(f) else ""
            if not p or p == "TOTAL":
                continue
            for m, j in meses:
                n = f[j] if j < len(f) else None
                if not isinstance(n, (int, float)) or isinstance(n, bool) or not n:
                    continue
                clave = (f"{anio}-{m:02d}", p)
                x = total.setdefault(clave, {"hotel": HOTEL, "mes": clave[0], "pais": p,
                                             "continente": region.get(p, RESTO.get(p, "SIN REFERENCIA")), "huespedes": 0})
                x["huespedes"] += n
    return sorted(total.values(), key=lambda r: (r["mes"], -r["huespedes"]))


def _buscar_hoja(wb):
    for ws in wb.worksheets:
        for fila in ws.iter_rows(min_row=1, max_row=5, values_only=True):
            cab = [_norm(c) for c in fila]
            if {"CONTINENTE", "ANO", "PAIS", "IMPORTE"} <= set(cab) and ("N MES" in cab or "MES" in cab):
                return ws, cab
    return None, None


def es_planilla(contenido: bytes) -> bool:
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(contenido), read_only=True, data_only=True)
    ws, _ = _buscar_hoja(wb)
    return ws is not None or next(_hojas_por_anio(wb), None) is not None


def leer(contenido: bytes) -> list[dict]:
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(contenido), read_only=True, data_only=True)
    ws, cab = _buscar_hoja(wb)
    if ws is None and next(_hojas_por_anio(wb), None) is not None:
        return _leer_por_anio(wb)
    if ws is None:
        raise ValueError("No se encontró la hoja con Continente / Año / PAÍS / Mes / Importe")
    i = {k: cab.index(k) for k in ("CONTINENTE", "ANO", "PAIS", "IMPORTE")}
    i_mes = cab.index("N MES") if "N MES" in cab else cab.index("MES")
    total: dict[tuple, dict] = {}
    for fila in ws.iter_rows(values_only=True):
        anio, mes, n = fila[i["ANO"]], fila[i_mes], fila[i["IMPORTE"]]
        if not isinstance(anio, (int, float)) or not isinstance(mes, (int, float)) or not isinstance(n, (int, float)):
            continue
        if not n:
            continue
        pais = " ".join(str(fila[i["PAIS"]] or "").split()).upper()
        clave = (f"{int(anio)}-{int(mes):02d}", pais)
        x = total.setdefault(clave, {"hotel": HOTEL, "mes": clave[0], "pais": pais,
                                     "continente": " ".join(str(fila[i["CONTINENTE"]] or "").split()).upper(),
                                     "huespedes": 0})
        x["huespedes"] += n
    return sorted(total.values(), key=lambda r: (r["mes"], -r["huespedes"]))


def guardar(filas: list[dict]) -> int:
    """La planilla es acumulada: reemplaza todo lo anterior del hotel."""
    return almacen.reemplazar_bloque("paises", COLS, filas, ("hotel",))
