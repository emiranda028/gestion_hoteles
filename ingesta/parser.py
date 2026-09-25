"""Lectura de reportes diarios en PDF y conversión a registros normalizados."""
from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

import pdfplumber

from .numeros import a_numero
from .paises import a_iso2

NUM = r"(\(?-?\$?\s*\d[\d.,]*\s*%?\)?)"

CAMPOS = [
    "habitaciones_disponibles",
    "habitaciones_ocupadas",
    "habitaciones_fuera_servicio",
    "huespedes",
    "llegadas",
    "salidas",
    "ocupacion_pct",
    "adr",
    "ingreso_habitaciones",
    "ingreso_ayb",
    "ingreso_otros",
    "ingreso_total",
]
OBLIGATORIOS = ["habitaciones_ocupadas", "ingreso_habitaciones"]

MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12,
}


@dataclass
class Reporte:
    hotel_id: str | None
    fecha: date | None
    plantilla: str
    valores: dict[str, float | None]
    procedencia: list[dict] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)

    @property
    def valido(self) -> bool:
        return self.hotel_id is not None and self.fecha is not None and all(
            self.valores.get(c) is not None for c in OBLIGATORIOS
        )


def extraer_texto(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        return "\n".join((p.extract_text() or "") for p in pdf.pages)


def _compilar(patron: str) -> re.Pattern:
    return re.compile(patron.replace("NUM", NUM), re.IGNORECASE | re.MULTILINE)


def _parsear_fecha(texto: str) -> date | None:
    t = texto.strip().lower()
    m = re.match(r"(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de\s+)?(\d{4})", t)
    if m:
        mes = MESES.get(m.group(2).replace("á", "a").replace("é", "e"))
        if mes:
            return date(int(m.group(3)), mes, int(m.group(1)))
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(t, fmt).date()
        except ValueError:
            continue
    return None


def elegir_plantilla(texto: str, plantillas: list[dict]) -> dict:
    bajo = texto.lower()
    respaldo = None
    for p in plantillas:
        claves = p.get("detectar") or []
        if not claves:
            respaldo = respaldo or p
        elif any(c.lower() in bajo for c in claves):
            return p
    if respaldo is None:
        raise ValueError("No hay plantilla genérica (con 'detectar: []') en config.yaml")
    return respaldo


def detectar_hotel(contexto: str, hoteles: list[dict]) -> dict | None:
    bajo = contexto.lower()
    for h in hoteles:
        if any(c.lower() in bajo for c in h.get("detectar", [])):
            return h
    return None


def _procedencia(texto: str, conf: dict | None) -> list[dict]:
    if not conf:
        return []
    inicio = _compilar(conf["inicio"]).search(texto)
    if not inicio:
        return []
    fin_re = _compilar(conf["fin"])
    linea_re = _compilar(conf["linea"])
    filas = []
    for linea in texto[inicio.end():].splitlines()[1:]:
        linea = linea.strip()
        if not linea:
            continue
        if fin_re.search(linea):
            break
        m = linea_re.search(linea)
        if not m:
            continue
        valor = a_numero(m.group("valor"))
        nombre = m.group("pais").strip()
        if valor is None:
            continue
        filas.append({"pais": nombre, "iso2": a_iso2(nombre) or "", "huespedes": int(valor)})
    return filas


def leer_reporte(
    pdf_bytes: bytes,
    config: dict,
    contexto_extra: str = "",
    fecha_mail: date | None = None,
    texto: str | None = None,
) -> Reporte:
    """Lee un PDF y devuelve un Reporte. `contexto_extra` = asunto, remitente y nombre de archivo."""
    texto = texto if texto is not None else extraer_texto(pdf_bytes)
    plantilla = elegir_plantilla(texto, config["plantillas"])
    avisos: list[str] = []

    hotel = detectar_hotel(texto + "\n" + contexto_extra, config["hoteles"])
    if hotel is None:
        avisos.append("No se pudo identificar el hotel (revisar 'detectar' en config.yaml)")

    fecha = None
    for patron in plantilla.get("fecha", []):
        for m in _compilar(patron).finditer(texto):
            fecha = _parsear_fecha(m.group(1))
            if fecha:
                break
        if fecha:
            break
    if fecha is None and fecha_mail is not None:
        fecha = fecha_mail - timedelta(days=config.get("dias_atras_si_no_hay_fecha", 1))
        avisos.append(f"El PDF no trae fecha legible; se usó la del mail: {fecha}")

    valores: dict[str, float | None] = {}
    for campo in CAMPOS:
        valores[campo] = None
        for patron in plantilla.get("campos", {}).get(campo, []):
            m = _compilar(patron).search(texto)
            if m:
                valores[campo] = a_numero(m.group(1))
                break

    _completar_derivados(valores, hotel, avisos)
    rep = Reporte(
        hotel_id=hotel["id"] if hotel else None,
        fecha=fecha,
        plantilla=plantilla["id"],
        valores=valores,
        procedencia=_procedencia(texto, plantilla.get("procedencia")),
        avisos=avisos,
    )
    faltan = [c for c in OBLIGATORIOS if valores.get(c) is None]
    if faltan:
        avisos.append("Faltan campos obligatorios: " + ", ".join(faltan))
    return rep


def _completar_derivados(v: dict, hotel: dict | None, avisos: list[str]) -> None:
    """Completa lo que se puede calcular y marca incoherencias."""
    if v["habitaciones_disponibles"] is None and hotel and hotel.get("habitaciones"):
        v["habitaciones_disponibles"] = float(hotel["habitaciones"]) - (v["habitaciones_fuera_servicio"] or 0)
    disp, ocup = v["habitaciones_disponibles"], v["habitaciones_ocupadas"]
    if ocup is None and disp and v["ocupacion_pct"] is not None:
        v["habitaciones_ocupadas"] = round(disp * v["ocupacion_pct"] / 100)
        ocup = v["habitaciones_ocupadas"]
    if v["ingreso_habitaciones"] is None and ocup and v["adr"] is not None:
        v["ingreso_habitaciones"] = round(ocup * v["adr"], 2)
    if v["ingreso_total"] is None and v["ingreso_habitaciones"] is not None:
        v["ingreso_total"] = sum(v[c] or 0 for c in ("ingreso_habitaciones", "ingreso_ayb", "ingreso_otros"))
    if disp and ocup is not None:
        if ocup > disp:
            avisos.append(f"Ocupadas ({ocup:g}) > disponibles ({disp:g}): revisar el PDF")
        calculada = 100 * ocup / disp
        if v["ocupacion_pct"] is not None and abs(calculada - v["ocupacion_pct"]) > 1.5:
            avisos.append(
                f"Ocupación informada {v['ocupacion_pct']:.1f}% difiere de la calculada {calculada:.1f}%"
            )
    if ocup and v["ingreso_habitaciones"] is not None and v["adr"] is not None:
        adr_calc = v["ingreso_habitaciones"] / ocup
        if v["adr"] and abs(adr_calc - v["adr"]) / v["adr"] > 0.03:
            avisos.append(f"ADR informado {v['adr']:.2f} difiere del calculado {adr_calc:.2f}")
