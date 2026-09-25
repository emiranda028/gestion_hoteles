"""Genera datos ficticios en data/demo/ para ver la web app sin datos reales.

    python -m ingesta.demo

Mientras el repositorio sea público, los datos reales no se suben: la app publicada muestra estos.
"""
import csv
import math
import random
from datetime import date, timedelta

from .almacen import BANCOS_COLS, DATA, DISP_COLS, FLASH_COLS, HF_COLS, PICKUP_COLS

HOTELES = [
    # id, habitaciones, ADR base USD, estacionalidad mensual
    ("demo-centro", 220, 160, [0.80, 0.78, 0.95, 1.00, 1.02, 0.98, 1.12, 1.00, 1.08, 1.10, 1.08, 0.92]),
    ("demo-costa", 140, 150, [1.45, 1.40, 1.05, 0.85, 0.65, 0.60, 0.80, 0.65, 0.80, 0.92, 1.05, 1.30]),
]
NIVELES = ["Member (MRD)", "Silver Elite (SLR)", "Gold Elite (GLD)", "Platinum Elite (PLT)", "Titanium Elite (TTM)"]


def tc(d: date) -> float:
    meses = (d.year - 2024) * 12 + d.month - 1
    return 950 * math.exp(0.018 * meses)


def main(desde=date(2024, 1, 1), hoy=date(2026, 9, 25)):
    rnd = random.Random(7)
    out = DATA / "demo"
    out.mkdir(parents=True, exist_ok=True)
    hf, flash, pickup, bonvoy, disp, bancos, tcs = [], [], [], [], [], [], []
    fin_forecast = date(hoy.year + (hoy.month > 9), (hoy.month + 2) % 12 + 1, 1) - timedelta(days=1)
    acum: dict[tuple, list[float]] = {}
    d = desde
    while d <= fin_forecast:
        tcs.append({"fecha": d, "ars_por_usd": round(tc(d), 2)})
        for hid, hab, adr0, est in HOTELES:
            historia = d < hoy
            finde = 1.12 if d.weekday() in (4, 5) else 0.93 if d.weekday() == 6 else 1.0
            occ = min(0.98, max(0.15, 0.64 * est[d.month - 1] * finde * (1 + 0.03 * (d.year - 2024)) + rnd.gauss(0, 0.05)))
            if not historia:
                occ *= max(0.35, 1 - (d - hoy).days / 110)  # el forecast se va llenando
            ocup = round(hab * occ)
            adr = adr0 * (0.85 + 0.15 * est[d.month - 1]) * (1 + 0.04 * (d.year - 2024)) * rnd.uniform(0.95, 1.05)
            rev = ocup * adr
            grp = round(ocup * rnd.uniform(0.1, 0.35))
            hf.append({"hotel": hid, "fecha": d, "tipo": "History" if historia else "Forecast", "total_occ": ocup,
                       "arr_rooms": round(ocup * 0.35), "comp_rooms": 0, "house_use": 0, "deduct_indiv": ocup - grp,
                       "deduct_group": grp, "occ_pct": round(ocup / hab, 4), "room_revenue": round(rev, 2),
                       "adr": round(adr, 2), "dep_rooms": round(ocup * 0.33), "day_use": 0, "no_show": 0, "ooo": 0,
                       "personas": round(ocup * 1.7), "fecha_reporte": hoy})
            if historia:
                ayb, otros = rev * rnd.uniform(0.2, 0.3), rev * 0.03
                a = acum.setdefault((hid, d.year, d.month), [0, 0, 0, 0, 0])
                y = acum.setdefault((hid, d.year), [0, 0, 0, 0, 0])
                for t in (a, y):
                    for i, v in enumerate((hab, ocup, rev, rev + ayb + otros, ayb)):
                        t[i] += v
                if d >= hoy - timedelta(days=400):
                    for concepto, i, dia in (("Total Rooms in Hotel", 0, hab), ("Rooms Occupied minus House Use", 1, ocup),
                                             ("Room Revenue", 2, rev), ("Total Revenue", 3, rev + ayb + otros),
                                             ("Food And Beverage Revenue", 4, ayb)):
                        flash.append({"hotel": hid, "fecha": d, "fecha_reporte": d + timedelta(days=1),
                                      "concepto": concepto, "dia": round(dia, 2), "mes": round(a[i], 2), "anio": round(y[i], 2)})
                    flash.append({"hotel": hid, "fecha": d, "fecha_reporte": d + timedelta(days=1),
                                  "concepto": "Other Revenue", "dia": round(otros, 2), "mes": 0, "anio": 0})
                for nivel in NIVELES:
                    n = rnd.randint(0, 4)
                    if n:
                        bonvoy.append({"hotel": hid, "fecha": d, "nivel": nivel, "cantidad": n})
        d += timedelta(days=1)

    # pick up: fotos de los últimos 90 días, crecen hacia el total del forecast
    totales = {}
    for f in hf:
        k = (f["hotel"], f["fecha"].isoformat()[:7])
        t = totales.setdefault(k, [0, 0.0, 0])
        t[0] += f["total_occ"]
        t[1] += f["room_revenue"]
        t[2] += f["deduct_group"]
    for i in range(90, -1, -1):
        r = hoy - timedelta(days=i)
        for (hid, mes), (n, rev, g) in totales.items():
            m0 = date(int(mes[:4]), int(mes[5:]), 1)
            if not (0 <= (m0.year - r.year) * 12 + m0.month - r.month <= 2):
                continue
            k = 1 - 0.004 * i * rnd.uniform(0.8, 1.2)
            dias_mes = 30
            hab = next(h[1] for h in HOTELES if h[0] == hid)
            pickup.append({"hotel": hid, "fecha_reporte": r, "mes": mes, "noches": round(n * k), "grupo": round(g * k),
                           "occ_pct": round(n * k / (hab * dias_mes), 4), "revenue": round(rev * k, 2),
                           "adr": round(rev / n, 2) if n else 0})

    # disponibilidades de un grupo ficticio
    d = hoy - timedelta(days=400)
    while d <= hoy:
        t = tc(d)
        pesos, fci, usd = rnd.uniform(90e6, 160e6), rnd.uniform(300e6, 500e6), rnd.uniform(500e3, 800e3)
        cobros, pagos = rnd.uniform(10e6, 40e6), rnd.uniform(20e6, 80e6)
        me_ars = usd * t
        total = pesos + fci + me_ars + cobros - pagos
        for estado, concepto, moneda, tipo, imp in [
            ("Real", "DISPONIBILIDADES", "Local", "ARS", total), ("Real", "Moneda extranjera", "Local", "ARS", me_ars),
            ("Real", "Moneda extranjera", "Extranjera", "USD", usd), ("Real", "Tipo de cambio USD", "Local", "USD", t),
            ("Real", "Bancos pesos", "Local", "ARS", pesos), ("Real", "Inversiones", "Local", "ARS", fci),
            ("Proyectado", "Cobranzas Proyectadas", "Local", "ARS", cobros),
            ("Proyectado", "Pagos programados", "Local", "ARS", -pagos)]:
            disp.append({"grupo": "demo", "fecha": d, "estado": estado, "concepto": concepto, "moneda": moneda,
                         "tipo_moneda": tipo, "importe": round(imp, 2)})
        d += timedelta(days=1)
    for seccion, banco, moneda, ars, orig in [("Bancos pesos", "Banco A", "ARS", 80e6, 80e6),
                                              ("Bancos pesos", "Banco B", "ARS", 45e6, 45e6),
                                              ("Moneda extranjera", "Banco A USD", "USD", 650e3 * tc(hoy), 650e3),
                                              ("Inversiones", "FCI Money Market", "ARS", 420e6, 420e6),
                                              ("Pagos proyectados", "Proveedores", "ARS", -50e6, -50e6),
                                              ("Cobros proyectados", "Tarjetas de crédito", "ARS", 25e6, 25e6)]:
        bancos.append({"grupo": "demo", "fecha": hoy, "seccion": seccion, "empresa": "HOTELES DEMO S.A.",
                       "banco": banco, "cuenta": "", "moneda": moneda, "importe_ars": ars, "importe_moneda": orig})

    for nombre, cols, filas in [("hf.csv", HF_COLS, hf), ("flash.csv", FLASH_COLS, flash),
                                ("pickup.csv", PICKUP_COLS, pickup), ("bonvoy.csv", ["hotel", "fecha", "nivel", "cantidad"], bonvoy),
                                ("disponibilidades.csv", DISP_COLS, disp), ("bancos.csv", BANCOS_COLS, bancos),
                                ("tipo_cambio.csv", ["fecha", "ars_por_usd"], tcs)]:
        with (out / nombre).open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(filas)
    for viejo in ("diario.csv", "procedencia.csv"):
        (out / viejo).unlink(missing_ok=True)
    print(f"Demo en {out}: {len(hf)} días H&F, {len(flash)} filas flash, {len(pickup)} fotos de pick up")


if __name__ == "__main__":
    main()
