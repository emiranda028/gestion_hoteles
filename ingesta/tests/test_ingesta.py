import os
from datetime import date, datetime
from pathlib import Path

import pytest
import yaml

from ingesta import almacen, disponibilidades, opera
from ingesta.numeros import a_numero
from ingesta.tests import muestras

CONFIG = yaml.safe_load((Path(__file__).parents[1] / "config.yaml").read_text(encoding="utf-8"))
CONFIG_PRUEBA = {**CONFIG, "hoteles": [
    {"id": "centro", "nombre": "Centro", "opera": "Hotel Ejemplo Centro", "base": "CENTRO", "grupo": "g", "habitaciones": 200},
    {"id": "costa", "nombre": "Costa", "opera": "Hotel Ejemplo Costa", "base": "COSTA", "grupo": "g", "habitaciones": 50},
], "grupos": [{"id": "g", "nombre": "G", "detectar": ["EJEMPLO"], "base": []}]}


@pytest.fixture
def data_tmp(tmp_path, monkeypatch):
    monkeypatch.setattr(almacen, "DATA", tmp_path)
    monkeypatch.setattr(almacen, "REGISTRO", tmp_path / "procesados.json")
    monkeypatch.setattr(almacen, "EXCEL", tmp_path / "hoteles.xlsx")
    return tmp_path


@pytest.mark.parametrize("texto,esperado", [
    ("1.234.567,89", 1234567.89), ("1,234,567.89", 1234567.89), ("$ 12.500", 12500), ("85,3 %", 85.3),
    ("(1.200)", -1200), ("142.50", 142.5), ("", None),
])
def test_numeros(texto, esperado):
    assert a_numero(texto) == esperado


def test_flash():
    f = opera.leer_flash(muestras.FLASH)
    assert f.hotel_nombre == "Hotel Ejemplo Centro"
    assert f.fecha_reporte == date(2026, 9, 25)
    assert f.fecha_negocio == date(2026, 9, 24)
    assert f.moneda == "USD"
    assert f.conceptos["Room Revenue"] == (22500.0, 534600.0, 5610000.0)
    assert f.conceptos["Other Revenue"][0] == -120.0
    assert f.conceptos["% Rooms Occupied for Tomorrow"] == (81.5, None, None)
    assert "Hotel Ejemplo Centro" not in " ".join(f.conceptos)


def test_hf_historia_y_forecast():
    r = opera.leer_hf(muestras.HF)
    assert (r.desde, r.hasta, r.moneda) == (date(2026, 9, 29), date(2026, 9, 30), "USD")
    h, fc = r.dias
    assert (h.tipo, h.total_occ, h.no_show, h.ooo, h.personas) == ("History", 100, 2, 3, 160)
    assert h.occ_pct == pytest.approx(0.5)
    assert (fc.tipo, fc.no_show, fc.ooo, fc.personas, fc.room_revenue) == ("Forecast", None, 1, 190, 19200)
    assert r.total.total_occ == 220 and r.total.deduct_group == 50
    assert not r.mes_completo


def test_hf_con_no_deducidas():
    r = opera.leer_hf(muestras.HF_NON_DED)
    d = r.dias[0]
    assert (d.deduct_indiv, d.deduct_group, d.room_revenue, d.ooo, d.personas) == (32, 8, 5600, 1, 62)
    assert r.mes_completo
    assert r.total.total_occ == 85


def test_elite():
    e = opera.leer_elite(muestras.ELITE)
    assert e.llegadas == {(date(2026, 9, 25), "Gold Elite"): 2, (date(2026, 9, 25), "Member (MRD)"): 1}


def test_pdf_de_punta_a_punta(data_tmp):
    from ingesta.procesar import procesar
    rs = procesar("flash.pdf", muestras.pdf(muestras.FLASH), CONFIG_PRUEBA, None)
    rs += procesar("hf.pdf", muestras.pdf(muestras.HF_NON_DED), CONFIG_PRUEBA, None)
    rs += procesar("elite.pdf", muestras.pdf(muestras.ELITE), CONFIG_PRUEBA, None)
    assert all(r.ok for r in rs), [r.avisos for r in rs]
    flash = {r["concepto"]: r for r in almacen.leer("flash")}
    assert flash["Total Revenue"]["dia"] == "27380.50"
    assert float(flash["Tasa Ocupación"]["dia"]) == pytest.approx(149 / 200)
    assert len(almacen.leer("hf")) == 2
    pk = almacen.leer("pickup")
    assert pk[0]["mes"] == "2026-10" and pk[0]["noches"] == "85"
    assert {r["nivel"] for r in almacen.leer("bonvoy")} == {"Gold Elite (GLD)", "Member (MRD)"}
    # reprocesar no duplica
    procesar("hf.pdf", muestras.pdf(muestras.HF_NON_DED), CONFIG_PRUEBA, None)
    assert len(almacen.leer("hf")) == 2


def _planilla():
    d = datetime(2026, 9, 24)
    v = [None] * 10

    def f(**cols):
        r = list(v)
        for k, x in cols.items():
            r[int(k[1:])] = x
        return r
    return [
        f(c1="Saldos Bancos, FCI, Caja:"),
        f(c1="BANCOS", c2="FECHA", c3="EMPRESA", c4="BANCO", c5="CUENTA.Nº.", c6="EXTRACTO"),
        f(c2=d, c3="EJEMPLO S.A.", c4="Banco A", c5="1-2", c6=1000.0),
        f(c2=d, c3="EJEMPLO S.A.", c4="Banco B", c5="3-4", c6=500.0),
        f(c2=d, c3="TOTAL BANCOS (según extracto)", c6=1500.0),
        f(c1="MONEDA EXTRANJERA", c2="FECHA", c3="EMPRESA", c4="BANCO", c5="CUENTA.Nº.", c6="IMPORTE", c7="EXTRACTO", c8="TP BNA Billete venta"),
        f(c2=d, c3="EJEMPLO S.A.", c4="Banco A USD", c5="9", c6=20000.0, c7=20.0, c8=1000.0),
        f(c2=d, c3="EJEMPLO S.A.", c4="Caja Efectivo  USD", c5="Tesoreria", c6=10000.0, c7=10.0, c8=1000.0),
        f(c2=d, c3="TOTAL USD ", c6=30000.0, c7=30.0, c8=1000.0),
        f(c2=d, c3="EJEMPLO S.A.", c4="Caja Efectivo EUROS", c5="Caja de Seguridad", c6=1200.0, c7=1.0, c8=1200.0),
        f(c2=d, c3="TOTAL EUR", c6=1200.0, c7=1.0, c8=1200.0),
        f(c2=d, c3="TOTAL MONEDA EXTRAJERA VAL.MEP", c6=31200.0),
        f(c1="INVERSIONES", c2="FECHA", c3="EMPRESA", c4="BANCO", c5="CUENTA.Nº.", c6="EXTRACTO"),
        f(c2=d, c3="EJEMPLO S.A.", c4="BANCO A", c5="FCI", c6=4000.0),
        f(c2=d, c3="TOTAL FONDO COMUN DE INVERSION", c6=4000.0),
        f(c1="Pagos proyectados "),
        f(c1="PROVEEDORES", c2=d, c3="Cheques emitidos (Manuales + echeq's)", c4="EJEMPLO S.A.", c6=300.0),
        f(c1="PRESTAMOS", c2=d, c3="Debito automático", c4="EJEMPLO S.A.", c6=200.0),
        f(c1="SUB-TOTAL", c2=d, c3="PAGOS PROYECTADOS", c6=500.0),
        f(c1="Cobros proyectado"),
        f(c1="TARJETAS DE CREDITOS", c2=d, c3="Liquidaciones VISA", c5="HOTEL", c6=700.0),
        f(c1="SUB-TOTAL", c2=d, c3="COBROS PROYECTADOS", c6=700.0),
        f(c1="TOTAL", c2=d, c6=36900.0),
    ]


def test_disponibilidades():
    d = disponibilidades.leer_filas(_planilla())
    r = {(x["concepto"], x["moneda"], x["tipo_moneda"]): x["importe"] for x in d.resumen}
    assert d.empresa == "EJEMPLO S.A."
    assert r[("DISPONIBILIDADES", "Local", "ARS")] == 36900
    assert r[("Bancos pesos", "Local", "ARS")] == 1500
    assert r[("Moneda extranjera", "Extranjera", "USD")] == 30
    assert r[("Bancos dólares", "Extranjera", "USD")] == 20
    assert r[("Efectivo - Tesorería", "Extranjera", "USD")] == 10
    assert r[("Inversiones", "Local", "ARS")] == 4000
    assert r[("Cheques emitidos", "Local", "ARS")] == -300
    assert r[("Pagos programados", "Local", "ARS")] == -200
    assert r[("Cobranzas Proyectadas", "Local", "ARS")] == 700
    assert r[("Moneda Local", "Local", "ARS")] == 36900 - 31200
    assert d.tc_bna == 1000
    assert len([x for x in d.detalle if x["seccion"] == "Bancos pesos"]) == 2


MUESTRAS = os.environ.get("MUESTRAS_REALES")


@pytest.mark.skipif(not MUESTRAS, reason="definir MUESTRAS_REALES=carpeta con reportes reales")
def test_reportes_reales():
    """Corre sobre una carpeta local con reportes reales (no se suben al repositorio)."""
    from ingesta.procesar import expandir
    vistos = 0
    for ruta in Path(MUESTRAS).rglob("*.pdf"):
        for nombre, contenido in expandir(ruta.name, ruta.read_bytes()):
            texto = opera.extraer_texto(contenido)
            tipo = opera.tipo_reporte(texto)
            if tipo == "flash":
                assert opera.leer_flash(texto).conceptos
            elif tipo == "hf":
                assert opera.leer_hf(texto).dias
            vistos += tipo is not None
    assert vistos


def test_paises(data_tmp):
    from openpyxl import Workbook

    from ingesta import paises
    wb = Workbook()
    wb.active.title = "Resumen"
    ws = wb.create_sheet("País Origen")
    ws.append(["Continente", "Año", "PAÍS ", "Mes", "N° Mes", "Importe"])
    ws.append(["AMÉRICA", 2025, "ARGENTINA", "Enero", 1, 100])
    ws.append(["AMÉRICA", 2025, "ARGENTINA ", "Enero", 1, 5])
    ws.append(["EUROPA", 2025, "ESPAÑA", "Febrero", 2, 7])
    ws.append(["ASIA", 2025, "VIETNAM", "Febrero", 2, 0])
    import io
    buf = io.BytesIO()
    wb.save(buf)
    assert paises.es_planilla(buf.getvalue())
    filas = paises.leer(buf.getvalue())
    assert [(f["mes"], f["pais"], f["huespedes"]) for f in filas] == [("2025-01", "ARGENTINA", 105), ("2025-02", "ESPAÑA", 7)]
    paises.guardar(filas)
    paises.guardar(filas)
    assert len(almacen.leer("paises")) == 2


def test_normalizar_pesos_a_dolares(data_tmp):
    from ingesta.normalizar import normalizar
    almacen.escribir("tipo_cambio", almacen.TC_COLS, [{"fecha": "2025-01-10", "ars_por_usd": "1000"}])
    base = {c: "" for c in almacen.HF_COLS}
    almacen.escribir("hf", almacen.HF_COLS, [
        {**base, "hotel": "h", "fecha": "2025-01-10", "total_occ": "10", "room_revenue": "1500000", "adr": "150000"},
        {**base, "hotel": "h", "fecha": "2025-01-11", "total_occ": "10", "room_revenue": "1500", "adr": "150000"},
        {**base, "hotel": "h", "fecha": "2025-01-12", "total_occ": "10", "room_revenue": "1500", "adr": "150"},
    ])
    assert normalizar()["hf"] == (2, 0)
    filas = almacen.leer("hf")
    assert (filas[0]["room_revenue"], filas[0]["adr"]) == ("1500", "150")  # toda la fila estaba en pesos
    assert (filas[1]["room_revenue"], filas[1]["adr"]) == ("1500", "150")  # solo la tarifa estaba mal
    assert filas[2]["adr"] == "150"
    assert normalizar()["hf"] == (0, 0)  # idempotente
