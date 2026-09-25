"""Genera datos de demostración en data/demo/ para ver la web app sin datos reales.

    python -m ingesta.demo
"""
import csv
import math
import random
from datetime import date, timedelta

from .almacen import COLS_DIARIO, COLS_PROC, DATA

HOTELES = [
    # id, nombre, habitaciones, ADR base USD, perfil de estacionalidad mensual (1 = promedio)
    ("hotel-demo-1", "Hotel Demo Centro", 120, 95,
     [0.80, 0.78, 0.95, 1.00, 1.02, 0.98, 1.12, 1.00, 1.08, 1.10, 1.08, 0.92]),
    ("hotel-demo-2", "Hotel Demo Costa", 64, 130,
     [1.45, 1.40, 1.05, 0.85, 0.65, 0.60, 0.80, 0.65, 0.80, 0.92, 1.05, 1.30]),
]
PAISES = [("Argentina", "AR", 0.62), ("Brasil", "BR", 0.14), ("Chile", "CL", 0.06), ("Uruguay", "UY", 0.05),
          ("Estados Unidos", "US", 0.05), ("España", "ES", 0.03), ("Alemania", "DE", 0.02),
          ("Francia", "FR", 0.015), ("México", "MX", 0.015)]


def tipo_cambio(d: date) -> float:
    """ARS por USD con devaluación mensual decreciente (serie inventada)."""
    meses = (d.year - 2024) * 12 + d.month - 1 + d.day / 30
    return 820 * math.exp(0.035 * meses - 0.0004 * meses ** 2)


def main(desde=date(2024, 1, 1), hasta=date(2026, 9, 24)):
    rnd = random.Random(42)
    out = DATA / "demo"
    out.mkdir(parents=True, exist_ok=True)
    diario, proc, tc = [], [], []
    d = desde
    while d <= hasta:
        cambio = tipo_cambio(d)
        tc.append({"fecha": d.isoformat(), "ars_por_usd": f"{cambio:.2f}"})
        for hid, nombre, hab, adr_usd, estac in HOTELES:
            anio = d.year - 2024
            finde = 1.12 if d.weekday() in (4, 5) else 0.93 if d.weekday() == 6 else 1.0
            ocup = min(0.99, max(0.18, 0.66 * estac[d.month - 1] * finde * (1 + 0.03 * anio) + rnd.gauss(0, 0.05)))
            fos = rnd.choice([0, 0, 0, 1, 2])
            disp = hab - fos
            ocupadas = round(disp * ocup)
            adr = adr_usd * (0.85 + 0.15 * estac[d.month - 1]) * (1 + 0.04 * anio) * rnd.uniform(0.95, 1.05) * cambio
            ing_hab = ocupadas * adr
            ayb = ing_hab * rnd.uniform(0.18, 0.26)
            otros = ing_hab * rnd.uniform(0.02, 0.05)
            pax = round(ocupadas * rnd.uniform(1.7, 2.1))
            diario.append({
                "fecha": d.isoformat(), "hotel_id": hid, "hotel": nombre,
                "habitaciones_disponibles": disp, "habitaciones_ocupadas": ocupadas,
                "habitaciones_fuera_servicio": fos, "huespedes": pax,
                "llegadas": round(ocupadas * rnd.uniform(0.3, 0.45)), "salidas": round(ocupadas * rnd.uniform(0.3, 0.45)),
                "ocupacion_pct": f"{100 * ocupadas / disp:.2f}", "adr": f"{adr:.2f}",
                "ingreso_habitaciones": f"{ing_hab:.2f}", "ingreso_ayb": f"{ayb:.2f}", "ingreso_otros": f"{otros:.2f}",
                "ingreso_total": f"{ing_hab + ayb + otros:.2f}", "origen": "demo", "actualizado": "",
            })
            resto = pax
            for i, (pais, iso, peso) in enumerate(PAISES):
                n = resto if i == len(PAISES) - 1 else min(resto, round(pax * peso * rnd.uniform(0.7, 1.3)))
                resto -= n
                if n > 0:
                    proc.append({"fecha": d.isoformat(), "hotel_id": hid, "pais": pais, "iso2": iso, "huespedes": n})
        d += timedelta(days=1)
    for nombre, cols, filas in [("diario.csv", COLS_DIARIO, diario), ("procedencia.csv", COLS_PROC, proc),
                                ("tipo_cambio.csv", ["fecha", "ars_por_usd"], tc)]:
        with (out / nombre).open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(filas)
    print(f"Demo: {len(diario)} filas diarias, {len(proc)} de procedencia en {out}")


if __name__ == "__main__":
    main()
