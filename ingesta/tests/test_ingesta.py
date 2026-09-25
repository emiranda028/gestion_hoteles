from datetime import date
from pathlib import Path

import pytest
import yaml

from ingesta.numeros import a_numero
from ingesta.parser import leer_reporte
from ingesta.tests import muestras

CONFIG = yaml.safe_load((Path(__file__).parents[1] / "config.yaml").read_text(encoding="utf-8"))


@pytest.mark.parametrize("texto,esperado", [
    ("1.234.567,89", 1234567.89),
    ("1,234,567.89", 1234567.89),
    ("$ 12.500", 12500),
    ("12,5", 12.5),
    ("85,3 %", 85.3),
    ("(1.200)", -1200),
    ("-45.10", -45.10),
    ("0,500", 0.5),
    ("142.50", 142.5),
    ("", None),
    ("n/d", None),
])
def test_numeros(texto, esperado):
    assert a_numero(texto) == esperado


def test_reporte_en_castellano():
    rep = leer_reporte(muestras.reporte_es(), CONFIG)
    assert rep.valido, rep.avisos
    assert rep.hotel_id == "hotel-demo-1"
    assert rep.fecha == date(2026, 9, 24)
    v = rep.valores
    assert v["habitaciones_disponibles"] == 118
    assert v["habitaciones_ocupadas"] == 97
    assert v["habitaciones_fuera_servicio"] == 2
    assert v["huespedes"] == 181
    assert v["llegadas"] == 34 and v["salidas"] == 29
    assert v["adr"] == 98450
    assert v["ingreso_habitaciones"] == 9549650
    assert v["ingreso_ayb"] == 2310200.5
    assert v["ingreso_total"] == 12004850.5
    assert rep.avisos == []
    paises = {p["pais"]: (p["iso2"], p["huespedes"]) for p in rep.procedencia}
    assert paises["Argentina"] == ("AR", 120)
    assert paises["Estados Unidos"] == ("US", 12)
    assert paises["España"] == ("ES", 8)
    assert paises["Narnia"] == ("", 10)
    assert "Total" not in paises


def test_reporte_en_ingles_toma_columna_del_dia():
    rep = leer_reporte(muestras.reporte_en_columnas(), CONFIG)
    assert rep.valido, rep.avisos
    assert rep.hotel_id == "hotel-demo-2"
    assert rep.fecha == date(2026, 9, 24)
    assert rep.valores["habitaciones_ocupadas"] == 51
    assert rep.valores["adr"] == 142.5
    assert rep.valores["ingreso_habitaciones"] == 7267.5
    assert rep.valores["ingreso_total"] == 9187.5
    assert rep.avisos == []


def test_hotel_por_asunto_y_fecha_del_mail():
    rep = leer_reporte(muestras.reporte_sin_fecha_ni_hotel(), CONFIG,
                       contexto_extra="Reporte diario DEMO COSTA", fecha_mail=date(2026, 9, 25))
    assert rep.hotel_id == "hotel-demo-2"
    assert rep.fecha == date(2026, 9, 24)
    assert rep.valores["habitaciones_disponibles"] == 64  # del inventario en config
    assert rep.valido


def test_guardar_es_idempotente(tmp_path, monkeypatch):
    from ingesta import almacen
    for nombre in ("DATA", "DIARIO", "PROCEDENCIA", "EXCEL", "REGISTRO"):
        monkeypatch.setattr(almacen, nombre, tmp_path / Path(str(getattr(almacen, nombre))).name)
    rep = leer_reporte(muestras.reporte_es(), CONFIG)
    assert almacen.guardar([rep], CONFIG["hoteles"], ["a.pdf"]) == 1
    assert almacen.guardar([rep], CONFIG["hoteles"], ["a.pdf"]) == 1
    filas = (tmp_path / "diario.csv").read_text().strip().splitlines()
    assert len(filas) == 2
    proc = (tmp_path / "procedencia.csv").read_text().strip().splitlines()
    assert len(proc) == 1 + 5
    assert (tmp_path / "hoteles.xlsx").exists()
