"""Lectura de los reportes de Opera Cloud que mandan los hoteles.

- F116 Manager - Flash        -> conceptos con valores Día / Mes / Año
- R106 History and Forecast   -> una fila por día (historia y forecast) + total del período
- J146 Elite Arrivals         -> llegadas de socios Bonvoy por nivel

Todas las funciones reciben el texto extraído del PDF (ver extraer_texto), así se
pueden probar sin los PDF originales.
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime

import pdfplumber

from .numeros import a_numero

_FECHA = r"(\d{2}-\d{2}-\d{2})"
_NUM = r"-?[\d,]+(?:\.\d+)?%?"


def extraer_texto(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        return "\n".join((p.extract_text() or "") for p in pdf.pages)


def _fecha(s: str) -> date:
    return datetime.strptime(s, "%d-%m-%y").date()


def _num(s: str) -> float:
    # Opera exporta siempre con coma de miles y punto decimal
    return float(s.replace(",", "").replace("%", ""))


def tipo_reporte(texto: str) -> str | None:
    cab = "\n".join(texto.splitlines()[:6])
    if "HUESPEDES VIP" in texto.upper() and "PREVISI" in texto.upper():
        return "auditoria"
    if "F116 Manager" in cab:
        return "flash"
    if "R106 History and Forecast" in cab:
        return "hf"
    if "J146 Elite Arrivals" in cab:
        return "elite"
    return None


def cabecera(texto: str) -> tuple[str, date | None]:
    """Primera línea: '<Nombre del hotel> dd-mm-yy' (fecha de emisión del reporte)."""
    primera = texto.strip().splitlines()[0].strip()
    m = re.match(rf"(.+?)\s+{_FECHA}$", primera)
    if not m:
        return primera, None
    return m.group(1).strip(), _fecha(m.group(2))


def _moneda(texto: str) -> str:
    m = re.search(r"Currency\s*:?\s*([A-Z]{3})", texto)
    return m.group(1) if m else "LOCAL"


# --------------------------------------------------------------------------- Flash


@dataclass
class Flash:
    hotel_nombre: str
    fecha_reporte: date | None
    fecha_negocio: date
    moneda: str
    conceptos: dict[str, tuple[float | None, float | None, float | None]]


_LINEA_FLASH = re.compile(rf"^(?P<concepto>.*?[A-Za-z)'])\s+(?P<valores>{_NUM}(?:\s+{_NUM}){{0,2}})$")


def leer_flash(texto: str) -> Flash:
    nombre, emitido = cabecera(texto)
    m = re.search(rf"Month to Date\s+{_FECHA}", texto)
    if not m:
        raise ValueError("Flash sin fecha de negocio ('Calendar/Month to Date')")
    conceptos: dict[str, tuple] = {}
    for linea in texto.splitlines():
        linea = linea.strip()
        if not linea or linea.startswith(("Filter", "Room Class", "Currency", "DAY MONTH", "F116")):
            continue
        mm = _LINEA_FLASH.match(linea)
        if not mm:
            continue
        valores = [_num(v) for v in mm.group("valores").split()]
        concepto = mm.group("concepto").strip()
        if concepto in conceptos or concepto.startswith(nombre):
            continue
        valores += [None] * (3 - len(valores))
        conceptos[concepto] = tuple(valores)
    return Flash(nombre, emitido, _fecha(m.group(1)), _moneda(texto), conceptos)


# --------------------------------------------------------------------------- H&F


@dataclass
class DiaHF:
    fecha: date
    tipo: str  # History | Forecast
    total_occ: float
    arr_rooms: float
    comp_rooms: float
    house_use: float
    deduct_indiv: float
    deduct_group: float
    occ_pct: float  # 0..1
    room_revenue: float
    adr: float
    dep_rooms: float
    day_use: float
    no_show: float | None
    ooo: float
    personas: float


@dataclass
class HistoryForecast:
    hotel_nombre: str
    fecha_reporte: date | None
    desde: date
    hasta: date
    moneda: str
    dias: list[DiaHF] = field(default_factory=list)
    total: DiaHF | None = None
    total_forecast: DiaHF | None = None

    @property
    def mes_completo(self) -> bool:
        """El reporte cubre un mes calendario entero (sirve para el pick up)."""
        return (self.desde.day == 1 and (self.desde.year, self.desde.month) == (self.hasta.year, self.hasta.month)
                and self.hasta.day == _ultimo_dia(self.hasta))


def _ultimo_dia(d: date) -> int:
    siguiente = date(d.year + (d.month == 12), d.month % 12 + 1, 1)
    return (siguiente.toordinal() - date(d.year, d.month, 1).toordinal())


def _fila_hf(valores: list[float], con_non_ded: bool, forecast: bool) -> dict:
    v = list(valores)
    if con_non_ded:
        # Deduct Indiv, Non-Ded Indiv, Deduct Group, Non-Ded Group -> se suman deducidas y no deducidas
        v = v[:4] + [v[4] + v[5], v[6] + v[7]] + v[8:]
    if forecast:
        v = v[:11] + [None] + v[11:]  # el forecast no trae No Show
    claves = ["total_occ", "arr_rooms", "comp_rooms", "house_use", "deduct_indiv", "deduct_group", "occ_pct",
              "room_revenue", "adr", "dep_rooms", "day_use", "no_show", "ooo", "personas"]
    if len(v) != len(claves):
        raise ValueError(f"Fila H&F con {len(valores)} valores, formato no reconocido")
    fila = dict(zip(claves, v))
    fila["occ_pct"] = fila["occ_pct"] / 100
    return fila


def leer_hf(texto: str) -> HistoryForecast:
    nombre, emitido = cabecera(texto)
    m = re.search(rf"From Date\s+{_FECHA}\s+To Date\s+{_FECHA}", texto)
    if not m:
        raise ValueError("H&F sin rango de fechas ('From Date ... To Date')")
    rep = HistoryForecast(nombre, emitido, _fecha(m.group(1)), _fecha(m.group(2)), _moneda(texto))
    encabezado = re.split(r"^(?:History|Forecast)$", texto, maxsplit=1, flags=re.MULTILINE)[0]
    con_non_ded = "Non-Ded" in encabezado
    seccion = None
    for linea in texto.splitlines():
        linea = linea.strip()
        if linea in ("History", "Forecast"):
            seccion = linea
            continue
        if seccion is None:
            continue
        md = re.match(rf"^{_FECHA}\s+[A-Za-z]{{3}}\s+(.*)$", linea)
        mt = re.match(r"^(Subtotal|Total)\s+(.*)$", linea)
        if md:
            valores = [_num(x) for x in md.group(2).split()]
            fila = _fila_hf(valores, con_non_ded, seccion == "Forecast")
            rep.dias.append(DiaHF(fecha=_fecha(md.group(1)), tipo=seccion, **fila))
        elif mt:
            valores = [_num(x) for x in mt.group(2).split()]
            # el Total general tiene No Show si hubo historia; el Subtotal de forecast no
            es_forecast = seccion == "Forecast" and mt.group(1) == "Subtotal"
            n_base = 16 if con_non_ded else 14
            if mt.group(1) == "Total" and len(valores) == n_base - 1:
                es_forecast = True
            fila = _fila_hf(valores, con_non_ded, es_forecast)
            d = DiaHF(fecha=rep.hasta, tipo=mt.group(1), **fila)
            if mt.group(1) == "Total":
                rep.total = d
            elif seccion == "Forecast":
                rep.total_forecast = d
    return rep


# --------------------------------------------------------------------------- Elite Arrivals


@dataclass
class EliteArrivals:
    hotel_nombre: str
    fecha_reporte: date | None
    llegadas: dict[tuple[date, str], int]  # (fecha de llegada, nivel) -> cantidad


def leer_elite(texto: str) -> EliteArrivals:
    nombre, emitido = cabecera(texto)
    llegadas: dict[tuple[date, str], int] = {}
    fecha = nivel = None
    for linea in texto.splitlines():
        linea = linea.strip()
        m = re.match(rf"^Arrival Date\s+{_FECHA}", linea)
        if m:
            fecha = _fecha(m.group(1))
            continue
        m = re.match(r"^Membership Level\s+(.+)$", linea)
        if m:
            nivel = m.group(1).strip()
            continue
        m = re.match(r"^Subtotal Level:\s*(\d+)", linea)
        if m and fecha and nivel:
            llegadas[(fecha, nivel)] = llegadas.get((fecha, nivel), 0) + int(m.group(1))
            nivel = None
    return EliteArrivals(nombre, emitido, llegadas)


# --------------------------------------------------------------------------- Auditoría (City Express)

_MESES_EN = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


@dataclass
class Auditoria:
    fecha: date  # fecha de la auditoría (cierre del día)
    niveles: dict[str, int]  # nivel Bonvoy -> cantidad de huéspedes VIP informados


def leer_auditoria(texto: str) -> Auditoria:
    """Reporte de auditoría de City Express: de acá sale el Membership (lista 'HUESPEDES VIP')."""
    m = re.search(r"([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4})", texto)
    if not m or m.group(1).lower() not in _MESES_EN:
        raise ValueError("Auditoría sin fecha legible")
    fecha = date(int(m.group(3)), _MESES_EN[m.group(1).lower()], int(m.group(2)))
    niveles: dict[str, int] = {}
    dentro = False
    for linea in texto.splitlines():
        linea = linea.strip()
        if linea.upper().startswith("HUESPEDES VIP"):
            dentro = True
            continue
        if dentro:
            if not linea or linea.upper().startswith(("GSS", "ESS")):
                break
            mm = re.match(r"^.+\s-\s*([A-Za-zÁÉÍÓÚáéíóú ]+)$", linea)
            if mm:
                nivel = mm.group(1).strip()
                niveles[nivel] = niveles.get(nivel, 0) + 1
    return Auditoria(fecha, niveles)


__all__ = ["extraer_texto", "tipo_reporte", "leer_flash", "leer_hf", "leer_elite", "leer_auditoria", "a_numero"]
