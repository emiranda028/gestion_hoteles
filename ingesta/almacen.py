"""Persistencia en CSV (fuente de la web app) + Excel (compatibilidad con Power BI)."""
from __future__ import annotations

import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from .parser import CAMPOS, Reporte

RAIZ = Path(__file__).resolve().parent.parent
DATA = RAIZ / "data"
DIARIO = DATA / "diario.csv"
PROCEDENCIA = DATA / "procedencia.csv"
EXCEL = DATA / "hoteles.xlsx"
REGISTRO = DATA / "procesados.json"

COLS_DIARIO = ["fecha", "hotel_id", "hotel"] + CAMPOS + ["origen", "actualizado"]
COLS_PROC = ["fecha", "hotel_id", "pais", "iso2", "huespedes"]


def _leer(ruta: Path) -> list[dict]:
    if not ruta.exists() or ruta.stat().st_size == 0:
        return []
    with ruta.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _escribir(ruta: Path, columnas: list[str], filas: list[dict]) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with ruta.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=columnas, extrasaction="ignore")
        w.writeheader()
        w.writerows(filas)


def _fmt(v: float | None) -> str:
    if v is None:
        return ""
    return str(int(v)) if float(v).is_integer() else f"{v:.2f}"


def huella(pdf_bytes: bytes) -> str:
    return hashlib.sha256(pdf_bytes).hexdigest()[:16]


def ya_procesado(clave: str) -> bool:
    return clave in _registro()


def _registro() -> dict:
    if REGISTRO.exists():
        return json.loads(REGISTRO.read_text(encoding="utf-8"))
    return {}


def marcar_procesado(clave: str, info: dict) -> None:
    reg = _registro()
    reg[clave] = info
    REGISTRO.write_text(json.dumps(reg, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")


def guardar(reportes: list[Reporte], hoteles: list[dict], origenes: list[str]) -> int:
    """Inserta o reemplaza (fecha, hotel). Devuelve la cantidad de días guardados."""
    nombres = {h["id"]: h["nombre"] for h in hoteles}
    diario = {(r["fecha"], r["hotel_id"]): r for r in _leer(DIARIO)}
    proc = _leer(PROCEDENCIA)
    ahora = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    n = 0
    for rep, origen in zip(reportes, origenes):
        if not rep.valido:
            continue
        clave = (rep.fecha.isoformat(), rep.hotel_id)
        fila = {"fecha": clave[0], "hotel_id": rep.hotel_id, "hotel": nombres.get(rep.hotel_id, rep.hotel_id),
                "origen": origen, "actualizado": ahora}
        fila.update({c: _fmt(rep.valores.get(c)) for c in CAMPOS})
        diario[clave] = fila
        if rep.procedencia:
            proc = [p for p in proc if (p["fecha"], p["hotel_id"]) != clave]
            proc += [{"fecha": clave[0], "hotel_id": rep.hotel_id, **p} for p in rep.procedencia]
        n += 1
    filas = sorted(diario.values(), key=lambda r: (r["fecha"], r["hotel_id"]))
    _escribir(DIARIO, COLS_DIARIO, filas)
    _escribir(PROCEDENCIA, COLS_PROC, sorted(proc, key=lambda r: (r["fecha"], r["hotel_id"], r["pais"])))
    exportar_excel()
    return n


def exportar_excel() -> None:
    """Genera data/hoteles.xlsx con hojas Diario y Procedencia (misma info que los CSV)."""
    from openpyxl import Workbook

    wb = Workbook()
    for i, (nombre, ruta, cols) in enumerate(
        [("Diario", DIARIO, COLS_DIARIO), ("Procedencia", PROCEDENCIA, COLS_PROC)]
    ):
        ws = wb.active if i == 0 else wb.create_sheet()
        ws.title = nombre
        ws.append(cols)
        for fila in _leer(ruta):
            ws.append([_celda(c, fila.get(c, "")) for c in cols])
    wb.save(EXCEL)


def _celda(col: str, valor: str):
    if col == "fecha" and valor:
        return datetime.strptime(valor, "%Y-%m-%d").date()
    if col in CAMPOS or col == "huespedes":
        try:
            return float(valor) if valor != "" else None
        except ValueError:
            return valor
    return valor
