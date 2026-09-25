"""Genera PDFs de ejemplo con distintos formatos para probar el parser."""
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def pdf_desde_lineas(lineas: list[str]) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    y = 800
    for linea in lineas:
        c.drawString(40, y, linea)
        y -= 16
    c.save()
    return buf.getvalue()


def reporte_es() -> bytes:
    return pdf_desde_lineas([
        "HOTEL DEMO CENTRO - Informe diario de gerencia",
        "Fecha de cierre: 24/09/2026",
        "Habitaciones disponibles: 118",
        "Habitaciones fuera de servicio: 2",
        "Habitaciones ocupadas: 97",
        "Ocupación %: 82,20 %",
        "Huéspedes en casa: 181",
        "Llegadas: 34    Salidas: 29",
        "Tarifa promedio: $ 98.450,00",
        "Ingresos por habitaciones: $ 9.549.650,00",
        "Ingresos de A&B: $ 2.310.200,50",
        "Otros ingresos: $ 145.000",
        "Total ingresos: $ 12.004.850,50",
        "",
        "Procedencia de huéspedes",
        "Argentina 120",
        "Brasil 31",
        "Estados Unidos 12",
        "España 8",
        "Narnia 10",
        "Total 181",
    ])


def reporte_en_columnas() -> bytes:
    # Estilo Opera: columnas Día / Mes / Año; debe tomar el valor del día
    return pdf_desde_lineas([
        "Manager Flash Report - Hotel Demo Costa",
        "Business Date: 2026-09-24",
        "                         Day        MTD        YTD",
        "Rooms Available          64         1,536      17,088",
        "Rooms Occupied           51         1,102      12,950",
        "Occupancy %              79.69 %    71.74 %    75.78 %",
        "Average Rate             142.50     138.10     131.00",
        "Room Revenue             7,267.50   152,186.20 1,696,450.00",
        "F&B Revenue              1,920.00   40,100.00  402,300.00",
        "Total Revenue            9,187.50   192,286.20 2,098,750.00",
    ])


def reporte_sin_fecha_ni_hotel() -> bytes:
    return pdf_desde_lineas(["Habitaciones ocupadas: 10", "Ingresos por habitaciones: 1.000,00"])
