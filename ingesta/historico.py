"""Importa la base histórica (HF.xlsb) que hoy alimenta Power BI.

    python -m ingesta.run historico HF.xlsb

Lee las hojas H&F, Flash, Pick up (+1, +2), BonboyVF y Disponibilidades PBI. Lo que llegue
después por mail tiene prioridad sobre lo importado (se marca con fecha de reporte vacía).
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from . import almacen
from .procesar import nivel_bonvoy

EXCEL_0 = date(1899, 12, 30)


def _fecha(v) -> date | None:
    return EXCEL_0 + timedelta(days=int(v)) if isinstance(v, (int, float)) and v > 1 else None


def _n(v):
    return float(v) if isinstance(v, (int, float)) else None


def _filas(wb, hoja: str):
    with wb.get_sheet(hoja) as s:
        vacias = 0
        for i, r in enumerate(s.rows()):
            v = [c.v for c in r]
            if i == 0:
                continue
            if all(x is None for x in v[:5]):
                vacias += 1
                if vacias > 2000:  # hojas con un millón de filas vacías al final
                    return
                continue
            vacias = 0
            yield v + [None] * 25


def importar(ruta: str, config: dict) -> dict[str, int]:
    from pyxlsb import open_workbook

    hoteles = {h["base"].upper(): h["id"] for h in config["hoteles"]}
    grupos = {}
    for g in config["grupos"]:
        for i, etiqueta in enumerate(g["base"]):
            grupos[etiqueta.upper()] = (g["id"], i)
    wb = open_workbook(ruta)
    hojas = set(wb.sheets)
    cuenta: dict[str, int] = {}

    # H&F
    filas = []
    for v in _filas(wb, "H&F"):
        f, hotel = _fecha(v[15]), hoteles.get(str(v[18] or "").strip().upper())
        if not f or not hotel:
            continue
        tipo = "History" if v[17] == "History" else "Forecast"
        filas.append({"hotel": hotel, "fecha": f, "tipo": tipo, "total_occ": _n(v[1]), "arr_rooms": _n(v[2]),
                      "comp_rooms": _n(v[3]), "house_use": _n(v[4]), "deduct_indiv": _n(v[5]),
                      "deduct_group": _n(v[6]), "occ_pct": _n(v[7]), "room_revenue": _n(v[8]), "adr": _n(v[9]),
                      "dep_rooms": _n(v[10]), "day_use": _n(v[11]), "no_show": _n(v[12]), "ooo": _n(v[13]),
                      "personas": _n(v[14]), "fecha_reporte": ""})
    cuenta["hf"] = almacen.upsert("hf", filas)

    # Flash: DATE es el día en que llegó el reporte; la fecha de negocio es el día anterior
    filas = []
    for v in _filas(wb, "Flash"):
        f, hotel = _fecha(v[5]), hoteles.get(str(v[9] or "").strip().upper())
        if not f or not hotel or v[4] != "USD" or not v[0]:
            continue
        filas.append({"hotel": hotel, "fecha": f - timedelta(days=1), "fecha_reporte": "",
                      "concepto": str(v[0]).strip(), "dia": _n(v[1]), "mes": _n(v[2]), "anio": _n(v[3])})
    cuenta["flash"] = almacen.upsert("flash", filas)

    # Pick up: foto diaria del mes en curso (+0), el siguiente (+1) y el subsiguiente (+2)
    filas = []
    for hoja, desplazamiento in (("Pick up", 0), ("Pick up+1", 1), ("Pick up+2", 2)):
        if hoja not in hojas:
            continue
        for v in _filas(wb, hoja):
            f, hotel = _fecha(v[0]), hoteles.get(str(v[10] or "").strip().upper())
            if not f or not hotel or not _n(v[2]):
                continue
            t = f.year * 12 + f.month - 1 + desplazamiento
            filas.append({"hotel": hotel, "fecha_reporte": f, "mes": f"{t // 12}-{t % 12 + 1:02d}",
                          "noches": _n(v[2]), "grupo": _n(v[4]), "occ_pct": _n(v[1]), "revenue": _n(v[7]),
                          "adr": _n(v[6])})
    cuenta["pickup"] = almacen.upsert("pickup", filas)

    # Bonvoy
    filas = []
    for v in _filas(wb, "BonboyVF"):
        f, hotel = _fecha(v[2]), hoteles.get(str(v[22] or "").strip().upper())
        if f and hotel and _n(v[1]):
            filas.append({"hotel": hotel, "fecha": f, "nivel": nivel_bonvoy(str(v[0])), "cantidad": _n(v[1])})
    cuenta["bonvoy"] = almacen.upsert("bonvoy", filas)

    # Disponibilidades: la base repite el mismo informe del grupo en cada hotel; se toma uno solo
    por_bloque: dict[tuple[str, date], dict[int, list[dict]]] = defaultdict(lambda: defaultdict(list))
    for v in _filas(wb, "Disponibilidades PBI"):
        f, g = _fecha(v[0]), grupos.get(str(v[9] or "").strip().upper())
        if not f or not g or v[8] is None:
            continue
        por_bloque[(g[0], f)][g[1]].append({"grupo": g[0], "fecha": f, "estado": v[4], "concepto": v[5],
                                            "moneda": v[6], "tipo_moneda": v[7], "importe": _n(v[8])})
    filas = [x for bloques in por_bloque.values() for x in bloques[min(bloques)]]
    existentes = {(r["grupo"], r["fecha"]) for r in almacen.leer("disponibilidades")}
    filas = [x for x in filas if (x["grupo"], x["fecha"].isoformat()) not in existentes]
    cuenta["disponibilidades"] = almacen.reemplazar_bloque("disponibilidades", almacen.DISP_COLS, filas,
                                                           ("grupo", "fecha"))
    return cuenta
