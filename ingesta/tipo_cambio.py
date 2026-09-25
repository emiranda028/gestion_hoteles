"""Arma data/tipo_cambio.csv: dólar Banco Nación vendedor (billete) por día.

    python -m ingesta.tipo_cambio

Fuente principal: https://argentinadatos.com (serie "oficial" = BNA vendedor).
Respaldo: el "TP BNA Billete venta" que informa Numah en su planilla diaria de disponibilidades.
Todo el tablero trabaja en dólares; este tipo de cambio solo se usa para ver los montos en pesos
y para pasar a dólares los saldos en pesos de las disponibilidades.
"""
import json
import sys
import urllib.request

from . import almacen

URL = "https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial"


def main() -> int:
    serie: dict[str, float] = {}
    try:
        with urllib.request.urlopen(URL, timeout=30) as r:
            for d in json.load(r):
                if d.get("venta") and d["fecha"] >= "2020-01-01":
                    serie[d["fecha"]] = float(d["venta"])
        print(f"BNA vendedor: {len(serie)} días desde argentinadatos.com")
    except Exception as e:
        print(f"No se pudo consultar argentinadatos.com ({e}); se usa el respaldo")

    respaldo = 0
    for fila in almacen.leer("disponibilidades"):
        if fila["grupo"] == "numah" and fila["concepto"] == "Tipo de cambio USD" and fila["importe"]:
            if fila["fecha"] not in serie and float(fila["importe"]) > 1:
                serie[fila["fecha"]] = float(fila["importe"])
                respaldo += 1
    for fila in almacen.leer("tipo_cambio"):
        serie.setdefault(fila["fecha"], float(fila["ars_por_usd"]))
    almacen.escribir("tipo_cambio", almacen.TC_COLS,
                     [{"fecha": f, "ars_por_usd": f"{v:.2f}"} for f, v in sorted(serie.items())])
    print(f"tipo_cambio.csv: {len(serie)} días ({respaldo} tomados de la planilla de Numah)")
    from .normalizar import main as normalizar

    return normalizar()  # con más cotizaciones se pueden convertir registros viejos en pesos


if __name__ == "__main__":
    sys.exit(main())
