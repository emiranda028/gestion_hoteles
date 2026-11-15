"""Cuentas corporativas (Special Corporate) del Marriott Buenos Aires.

Planilla "Spc Corp" que comparte Ventas: una hoja por año (2023, 2024, ...) con la producción de cada
programa de tarifa corporativa por mes (RN / ADR / REV), con rubro y ejecutivo de cuenta, y las hojas
"RFP NN aprobados" con las tarifas negociadas de cada empresa para el año 20NN.

    python -m ingesta.run corporativas "Spc Corp.xlsx"
"""
from __future__ import annotations

import io
import re
import unicodedata
from datetime import date, datetime

from . import almacen

HOTEL = "marriott"
PROD_COLS = ["hotel", "mes", "cuenta", "rubro", "ejecutivo", "rn", "adr", "revenue"]
RFP_COLS = ["hotel", "anio", "cuenta", "desde", "hasta", "producto", "descuento", "tarifa1", "tarifa2", "tarifa3",
            "desayuno", "contacto"]

MESES = {"ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6, "JUL": 7, "AGO": 8, "SEP": 9, "SET": 9,
         "OCT": 10, "NOV": 11, "DIC": 12}


def _norm(v) -> str:
    t = unicodedata.normalize("NFKD", str(v or "")).encode("ascii", "ignore").decode()
    return " ".join(t.upper().split())


def _num(v) -> float | None:
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    return None


# Cada año el rubro se escribió distinto: se unifica (sin tildes, singular/plural, errores de tipeo)
RUBROS = {
    "CONSULTORA": "CONSULTORAS", "CONSULTORES": "CONSULTORAS", "CONSULTYORA": "CONSULTORAS", "CONSULTORIA": "CONSULTORAS",
    "ELECTRONICA": "ELECTRÓNICA", "LABORATORIO": "LABORATORIOS", "AUTOMOTOR": "AUTOMOTRIZ",
    "IT Y TELECOMUNICACION": "TECNOLOGÍA Y TELECOMUNICACIONES", "IT Y TELECOMUNICACIONES": "TECNOLOGÍA Y TELECOMUNICACIONES",
    "TECNOLOGIA": "TECNOLOGÍA Y TELECOMUNICACIONES", "BANCO": "BANCOS", "FINANCIERO": "FINANZAS",
    "GUBERNAMENTAL": "GUBERNAMENTALES", "ENTRENIMIENTO": "ENTRETENIMIENTO", "INGENIERIA": "INGENIERÍA",
    "PETROQUIMICA": "PETROQUÍMICA", "EMBAJADA": "EMBAJADAS", "AEROLINEA": "AEROLÍNEAS", "AEROLINEAS": "AEROLÍNEAS",
    "LINEAS AEREAS": "AEROLÍNEAS", "MINERA": "MINERÍA", "MINERIA": "MINERÍA", "LOGISTICA": "LOGÍSTICA",
    "HERRAMIENTA": "HERRAMIENTAS", "PETROLERA": "PETROLERAS", "PEROLERAS": "PETROLERAS", "PETROLEO": "PETROLERAS",
    "AGRICOLA": "AGRO", "ENERGIA": "ENERGÍA", "EDUCACION": "EDUCACIÓN", "BODEGAS": "BODEGAS Y EMBOTELLADORAS",
    "BODEGA Y EMBOTELLADORA": "BODEGAS Y EMBOTELLADORAS", "ASEGURADORA": "SEGUROS", "ASEGURADORAS": "SEGUROS",
    "QUIMICOS": "QUÍMICA", "QUIMICA": "QUÍMICA", "RUBRO": "",
}


def _rubro(v) -> str:
    t = _norm(v)
    return RUBROS.get(t, " ".join(str(v or "").split()).upper()) if t else ""


def _persona(v) -> str:
    t = " ".join(str(v or "").split())
    if not t or _norm(t) in ("RFP", "LRA"):
        return ""
    return "Dirección" if _norm(t) == "DIRECCION" else t.title()


def _hojas_anio(wb):
    """Hojas de producción: nombre = año y una fila de encabezado con «Rate Program Name»."""
    for ws in wb.worksheets:
        if not re.fullmatch(r"\s*20\d\d\s*", ws.title):
            continue
        filas = list(ws.iter_rows(max_row=8, values_only=True))
        for i, f in enumerate(filas):
            if any(_norm(c) == "RATE PROGRAM NAME" for c in f) and i > 0:
                yield ws, int(ws.title.strip()), i
                break


def es_planilla(contenido: bytes) -> bool:
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(contenido), read_only=True, data_only=True)
    return next(_hojas_anio(wb), None) is not None


def leer_produccion(wb) -> list[dict]:
    total: dict[tuple, dict] = {}
    for ws, anio, h in _hojas_anio(wb):
        filas = list(ws.iter_rows(values_only=True))
        cab = [_norm(c) for c in filas[h]]
        i_nom = cab.index("RATE PROGRAM NAME")
        i_rubro = cab.index("RUBRO") if "RUBRO" in cab else None
        # el ejecutivo está en la columna «EJECUTIVO» o, en los años viejos, en la segunda columna sin título
        i_ejec = cab.index("EJECUTIVO") if "EJECUTIVO" in cab else (1 if i_nom > 1 and not cab[1] else None)
        meses = []  # (mes, columna de RN)
        for j, c in enumerate(filas[h - 1]):
            m = MESES.get(_norm(c)[:3])
            if m and j + 2 < len(cab):
                meses.append((m, j))
        for f in filas[h + 1:]:
            cuenta = " ".join(str(f[i_nom] or "").split()).upper() if i_nom < len(f) else ""
            if not cuenta or _num(f[i_nom]) is not None:
                continue
            rubro = _rubro(f[i_rubro]) if i_rubro is not None else ""
            ejec = _persona(f[i_ejec]) if i_ejec is not None else ""
            for m, j in meses:
                rn = _num(f[j]) if j < len(f) else None
                if not rn:
                    continue
                adr = _num(f[j + 1]) if j + 1 < len(f) else None
                rev = _num(f[j + 2]) if j + 2 < len(f) else None
                if rev is None:
                    rev = rn * (adr or 0)
                clave = (f"{anio}-{m:02d}", cuenta)
                x = total.setdefault(clave, {"hotel": HOTEL, "mes": clave[0], "cuenta": cuenta, "rubro": rubro,
                                             "ejecutivo": ejec, "rn": 0.0, "revenue": 0.0})
                x["rn"] += rn
                x["revenue"] += rev
    salida = []
    for x in total.values():
        x["adr"] = round(x["revenue"] / x["rn"], 2) if x["rn"] else 0
        x["revenue"] = round(x["revenue"], 2)
        x["rn"] = int(round(x["rn"]))
        salida.append(x)
    return sorted(salida, key=lambda r: (r["mes"], r["cuenta"]))


def _fecha(v) -> str:
    if isinstance(v, (datetime, date)):
        return v.strftime("%Y-%m-%d")
    m = re.fullmatch(r"\s*(\d{1,2})/(\d{1,2})/(\d{4})\s*", str(v or ""))
    return f"{m[3]}-{int(m[1]):02d}-{int(m[2]):02d}" if m else ""  # formato de Marriott: mes/día/año


def leer_rfp(wb) -> list[dict]:
    hojas = []
    for ws in wb.worksheets:
        m = re.search(r"RFP\s*(\d{2,4})", ws.title, re.I)
        if not m:
            continue
        filas = list(ws.iter_rows(values_only=True))
        h = next((i for i, f in enumerate(filas[:6]) if any(_norm(c) == "ACCOUNTNAME" for c in f)), None)
        if h is not None:
            anio = int(m[1]) + (2000 if len(m[1]) == 2 else 0)
            hojas.append((anio, [_norm(c) for c in filas[h]], filas[h + 1:]))
    disenos = [cab for _, cab, _ in hojas]
    salida: dict[tuple, dict] = {}
    for anio, cab, filas in hojas:
        for f in filas:
            # alguna fila puede venir copiada con las columnas de otro año: se usa el diseño en el que encaja
            d = next((c for c in [cab, *disenos] if "RATE PRODUCT" in c and c.index("RATE PRODUCT") < len(f)
                      and "PRODUCER" in _norm(f[c.index("RATE PRODUCT")])), None)
            if d is None:
                continue
            v = lambda nombre: f[d.index(nombre)] if nombre in d and d.index(nombre) < len(f) else None  # noqa: E731
            cuenta = " ".join(str(v("ACCOUNTNAME") or "").split())
            if not cuenta:
                continue
            tarifas = [_num(v(f"ACCOUNT RATE SINGLE ROOM POOL GROUP {k}")) for k in (1, 2, 3)]
            desayuno = _norm(v("BREAKFAST INCLUDED"))
            salida[(anio, _norm(cuenta))] = {
                "hotel": HOTEL, "anio": anio, "cuenta": cuenta,
                "desde": _fecha(v("SEASON START")), "hasta": _fecha(v("SEASON END")),
                "producto": " ".join(str(v("RATE PRODUCT") or "").split()),
                "descuento": _num(v("DYNAMIC VP % DISCOUNT")) or "",
                "tarifa1": tarifas[0] or "", "tarifa2": tarifas[1] or "", "tarifa3": tarifas[2] or "",
                "desayuno": "si" if desayuno == "Y" else "no" if desayuno == "N" else "",
                "contacto": " ".join(str(v("PROPERTY SALES CONTACT NAME") or "").split()),
            }
    return sorted(salida.values(), key=lambda r: (r["anio"], r["cuenta"].upper()))


def leer(contenido: bytes) -> tuple[list[dict], list[dict]]:
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(contenido), read_only=True, data_only=True)
    prod = leer_produccion(wb)
    if not prod:
        raise ValueError("No se encontraron hojas por año con «Rate Program Name»")
    return prod, leer_rfp(wb)


def guardar(prod: list[dict], rfp: list[dict]) -> None:
    """La planilla es acumulada: reemplaza todo lo anterior del hotel."""
    almacen.reemplazar_bloque("corporativas", PROD_COLS, prod, ("hotel",))
    almacen.reemplazar_bloque("tarifas_corporativas", RFP_COLS, rfp, ("hotel",))
