"""Punto de entrada de la ingesta.

Uso:
  python -m ingesta.run gmail                         # baja los adjuntos nuevos de Gmail y actualiza data/
  python -m ingesta.run carpeta RUTA [--fecha AAAA-MM-DD]
                                                      # procesa PDFs / ZIPs / Excel de una carpeta
  python -m ingesta.run inspeccionar ARCHIVO          # muestra qué se lee de un archivo, sin guardar nada
  python -m ingesta.run historico HF.xlsb             # importa la base histórica de Power BI
  python -m ingesta.run paises Venta_x_PAIS.xlsx      # huéspedes por país (Marriott BA)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import date
from pathlib import Path

import yaml

from . import almacen, opera
from .procesar import Resultado, procesar

CONFIG = Path(__file__).with_name("config.yaml")
ESTADO = almacen.DATA / "ultima_ingesta.json"


def cargar_config() -> dict:
    return yaml.safe_load(CONFIG.read_text(encoding="utf-8"))


def _guardar_estado(resultados: list[Resultado]) -> None:
    almacen.DATA.mkdir(parents=True, exist_ok=True)
    ESTADO.write_text(json.dumps({
        "ejecutado": almacen.ahora(),
        "archivos": [{"origen": r.origen, "tipo": r.tipo, "hotel": r.hotel, "fecha": r.fecha, "ok": r.ok,
                      "detalle": r.detalle, "avisos": r.avisos} for r in resultados if r.tipo != "ignorado"],
    }, ensure_ascii=False, indent=1), encoding="utf-8")


def _imprimir(resultados: list[Resultado]) -> int:
    utiles = [r for r in resultados if r.tipo != "ignorado"]
    for r in utiles:
        print(f"[{'OK ' if r.ok else 'ERR'}] {r.tipo:20s} {r.hotel or '-':14s} {r.fecha or '':24s} {r.detalle}  <- {r.origen}")
        for a in r.avisos:
            print(f"       ! {a}")
    fallidos = [r for r in utiles if not r.ok]
    print(f"\n{len(utiles) - len(fallidos)} archivos procesados, {len(fallidos)} con error, "
          f"{len(resultados) - len(utiles)} ignorados.")
    return 1 if fallidos else 0


def _cerrar(config: dict, resultados: list[Resultado]) -> int:
    from .normalizar import normalizar

    normalizar()  # registros en pesos -> dólares
    _guardar_estado(resultados)
    almacen.exportar_excel(config["hoteles"])
    return _imprimir(resultados)


def cmd_gmail(_args) -> int:
    from .gmail import Gmail

    config = cargar_config()
    cliente = Gmail(config["gmail"])
    resultados: list[Resultado] = []
    procesados: dict[str, dict] = {}
    uids_ok = set()
    try:
        for adj in cliente.adjuntos():
            clave = f"{adj.message_id}|{hashlib.sha256(adj.contenido).hexdigest()[:16]}"
            if almacen.ya_procesado(clave):
                continue
            rs = procesar(adj.archivo, adj.contenido, config, adj.fecha_mail)
            for r in rs:
                r.origen = f"{adj.archivo} › {r.origen}" if r.origen != adj.archivo else r.origen
            resultados += rs
            if all(r.ok for r in rs):
                procesados[clave] = {"archivo": adj.archivo, "fecha_mail": str(adj.fecha_mail)}
                uids_ok.add(adj.uid)
        almacen.marcar_procesado(procesados)
        for uid in uids_ok:
            cliente.etiquetar(uid)
    finally:
        cliente.cerrar()
    if not resultados:
        print("No hay reportes nuevos.")
        return 0
    return _cerrar(config, resultados)


def cmd_carpeta(args) -> int:
    config = cargar_config()
    fecha = date.fromisoformat(args.fecha) if args.fecha else None
    resultados: list[Resultado] = []
    for ruta in sorted(p for p in Path(args.ruta).rglob("*") if p.is_file()):
        if ruta.suffix.lower() in (".pdf", ".zip", ".xlsx", ".xlsm"):
            resultados += procesar(ruta.name, ruta.read_bytes(), config, fecha or date.fromtimestamp(ruta.stat().st_mtime))
    return _cerrar(config, resultados)


def cmd_inspeccionar(args) -> int:
    ruta = Path(args.archivo)
    if ruta.suffix.lower() != ".pdf":
        print("Por ahora 'inspeccionar' muestra PDFs. Para Excel/ZIP usar 'carpeta' en una copia de data/.")
        return 1
    texto = opera.extraer_texto(ruta.read_bytes())
    tipo = opera.tipo_reporte(texto)
    print(f"Reporte: {tipo or 'no reconocido'}  ·  {opera.cabecera(texto)}")
    if tipo == "flash":
        f = opera.leer_flash(texto)
        print(f"Fecha de negocio {f.fecha_negocio} · moneda {f.moneda} · {len(f.conceptos)} conceptos")
        for k, v in f.conceptos.items():
            print(f"  {k:55s} {v}")
    elif tipo == "hf":
        r = opera.leer_hf(texto)
        print(f"{r.desde} a {r.hasta} · moneda {r.moneda} · mes completo: {r.mes_completo}")
        for d in r.dias:
            print(f"  {d.fecha} {d.tipo:8s} ocup {d.total_occ:5.0f}  occ {d.occ_pct:6.1%}  "
                  f"rev {d.room_revenue:12,.2f}  adr {d.adr:8.2f}")
        if r.total:
            print(f"  TOTAL   noches {r.total.total_occ:.0f}  grupos {r.total.deduct_group:.0f}  rev {r.total.room_revenue:,.2f}")
    elif tipo == "elite":
        for (f, n), c in opera.leer_elite(texto).llegadas.items():
            print(f"  {f} {n:30s} {c}")
    else:
        print(texto[:3000])
    return 0


def cmd_historico(args) -> int:
    from .historico import importar

    config = cargar_config()
    from .normalizar import main as normalizar

    cuenta = importar(args.archivo, config)
    for tabla, n in cuenta.items():
        print(f"  {tabla:18s} {n:7d} filas")
    normalizar()
    almacen.exportar_excel(config["hoteles"])
    return 0


def cmd_paises(args) -> int:
    from . import paises

    filas = paises.leer(Path(args.archivo).read_bytes())
    paises.guardar(filas)
    meses = sorted({f["mes"] for f in filas})
    print(f"Huéspedes por país: {len(filas)} filas, {meses[0]} a {meses[-1]}")
    almacen.exportar_excel(cargar_config()["hoteles"])
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="python -m ingesta.run", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("gmail").set_defaults(fn=cmd_gmail)
    c = sub.add_parser("carpeta")
    c.add_argument("ruta")
    c.add_argument("--fecha", help="fecha de recepción a usar para las disponibilidades (AAAA-MM-DD)")
    c.set_defaults(fn=cmd_carpeta)
    i = sub.add_parser("inspeccionar")
    i.add_argument("archivo")
    i.set_defaults(fn=cmd_inspeccionar)
    h = sub.add_parser("historico")
    h.add_argument("archivo")
    h.set_defaults(fn=cmd_historico)
    pa = sub.add_parser("paises")
    pa.add_argument("archivo")
    pa.set_defaults(fn=cmd_paises)
    args = p.parse_args(argv)
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
