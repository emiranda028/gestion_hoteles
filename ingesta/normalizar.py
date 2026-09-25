"""Pasa a dólares los registros viejos que quedaron en pesos.

Antes los hoteles mandaban los reportes en pesos y en la base quedaron algunos días así. Un registro
se considera en pesos cuando su tarifa promedio supera los USD 1.000 (ninguno de los hoteles llega a
esa tarifa en dólares, y en pesos siempre la supera). Se convierte con el dólar BNA vendedor del día.

    python -m ingesta.normalizar
"""
from __future__ import annotations

import bisect
from datetime import date, timedelta

from . import almacen

UMBRAL_ADR = 1000.0
DIAS_MAX_TC = 7  # si no hay cotización BNA a menos de una semana, el registro queda pendiente

CONCEPTOS_DINERO = {
    "ADR", "Room Revenue", "Food And Beverage Revenue", "Other Revenue", "Total Revenue", "Ventas Totales",
    "RevPar", "Revenue per Available Room", "Member Room Revenue",
}


class TipoCambio:
    def __init__(self):
        filas = sorted((f["fecha"], float(f["ars_por_usd"])) for f in almacen.leer("tipo_cambio") if f["ars_por_usd"])
        self.fechas = [f for f, _ in filas]
        self.valores = [v for _, v in filas]

    def para(self, fecha: str) -> float | None:
        if not self.fechas:
            return None
        i = bisect.bisect_right(self.fechas, fecha) - 1
        candidatos = [j for j in (i, i + 1) if 0 <= j < len(self.fechas)]
        d = date.fromisoformat(fecha)
        mejor = min(candidatos, key=lambda j: abs((date.fromisoformat(self.fechas[j]) - d).days))
        if abs((date.fromisoformat(self.fechas[mejor]) - d).days) > DIAS_MAX_TC:
            return None
        return self.valores[mejor]


def _f(v: str) -> float | None:
    return float(v) if v not in ("", None) else None


def _es_pesos(adr: float | None) -> bool:
    return adr is not None and adr > UMBRAL_ADR


def normalizar() -> dict[str, tuple[int, int]]:
    """Devuelve {tabla: (convertidos, pendientes sin tipo de cambio)}."""
    tc = TipoCambio()
    salida = {}

    # H&F: si ingresos / noches coincide con la tarifa, toda la fila está en pesos;
    # si no, solo la tarifa está mal cargada y se recalcula.
    filas, conv, pend = almacen.leer("hf"), 0, 0
    for r in filas:
        adr, rev, occ = _f(r["adr"]), _f(r["room_revenue"]), _f(r["total_occ"])
        if not _es_pesos(adr):
            continue
        implicita = rev / occ if rev and occ else None
        if implicita and abs(implicita - adr) / adr < 0.05:
            t = tc.para(r["fecha"])
            if not t:
                pend += 1
                continue
            r["room_revenue"], r["adr"] = almacen.fmt(rev / t), almacen.fmt(adr / t)
        else:
            r["adr"] = almacen.fmt(implicita or 0.0)
        conv += 1
    almacen.escribir("hf", almacen.HF_COLS, filas)
    salida["hf"] = (conv, pend)

    # Pick up
    filas, conv, pend = almacen.leer("pickup"), 0, 0
    for r in filas:
        adr, rev, n = _f(r["adr"]), _f(r["revenue"]), _f(r["noches"])
        if not _es_pesos(adr):
            continue
        t = tc.para(r["fecha_reporte"])
        if not t:
            pend += 1
            continue
        implicita = rev / n if rev and n else None
        r["adr"] = almacen.fmt(adr / t)
        if implicita and abs(implicita - adr) / adr < 0.05:
            r["revenue"] = almacen.fmt(rev / t)
        else:
            r["revenue"] = almacen.fmt((n or 0) * adr / t)
        conv += 1
    almacen.escribir("pickup", almacen.PICKUP_COLS, filas)
    salida["pickup"] = (conv, pend)

    # Flash: se revisa cada columna (día / mes / año) por separado
    filas = almacen.leer("flash")
    por_dia: dict[tuple[str, str], dict[str, dict]] = {}
    for r in filas:
        por_dia.setdefault((r["hotel"], r["fecha"]), {})[r["concepto"]] = r
    conv = pend = 0
    for (hotel, fecha), c in por_dia.items():
        for col in ("dia", "mes", "anio"):
            adr = _f(c["ADR"][col]) if "ADR" in c else None
            if adr is None and "Room Revenue" in c:
                ocup = c.get("Rooms Occupied minus House Use") or c.get("Rooms Occupied")
                rev, n = _f(c["Room Revenue"][col]), _f(ocup[col]) if ocup else None
                adr = rev / n if rev and n else None
            if not _es_pesos(adr):
                continue
            t = tc.para(fecha)
            if not t:
                pend += 1
                continue
            for concepto, r in c.items():
                if concepto in CONCEPTOS_DINERO and _f(r[col]) is not None:
                    r[col] = almacen.fmt(_f(r[col]) / t)
            conv += 1
    almacen.escribir("flash", almacen.FLASH_COLS, filas)
    salida["flash"] = (conv, pend)
    return salida


def main() -> int:
    for tabla, (c, p) in normalizar().items():
        print(f"  {tabla:8s} {c} registros pasados a dólares" + (f", {p} pendientes (sin BNA del día)" if p else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
