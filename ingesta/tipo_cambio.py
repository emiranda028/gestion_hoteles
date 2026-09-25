"""Actualiza data/tipo_cambio.csv (pesos por dólar) para ver los montos en USD.

    python -m ingesta.tipo_cambio            # dólar oficial (vendedor)
    python -m ingesta.tipo_cambio blue       # otras casas: blue, bolsa, contadoconliqui, mayorista

Fuente: https://argentinadatos.com (histórico diario, sin clave).
"""
import csv
import json
import sys
import urllib.request

from .almacen import DATA

URL = "https://api.argentinadatos.com/v1/cotizaciones/dolares/{casa}"


def main(casa: str = "oficial") -> int:
    try:
        with urllib.request.urlopen(URL.format(casa=casa), timeout=30) as r:
            datos = json.load(r)
    except Exception as e:  # sin cotización la app sigue funcionando en pesos
        print(f"No se pudo actualizar el tipo de cambio: {e}")
        return 0
    filas = sorted(
        {d["fecha"]: d["venta"] for d in datos if d.get("venta") and d["fecha"] >= "2018-01-01"}.items()
    )
    ruta = DATA / "tipo_cambio.csv"
    with ruta.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["fecha", "ars_por_usd"])
        w.writerows(filas)
    print(f"Tipo de cambio ({casa}): {len(filas)} días, último {filas[-1] if filas else '-'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:2]))
