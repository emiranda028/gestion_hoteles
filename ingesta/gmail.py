"""Descarga de adjuntos PDF desde Gmail por IMAP (con contraseña de aplicación)."""
from __future__ import annotations

import email
import imaplib
import os
from dataclasses import dataclass
from datetime import date
from email.header import decode_header, make_header
from email.utils import parsedate_to_datetime


EXTENSIONES = (".pdf", ".zip", ".xlsx", ".xlsm")


@dataclass
class Adjunto:
    uid: str
    message_id: str
    fecha_mail: date | None
    remitente: str
    asunto: str
    archivo: str
    contenido: bytes


def _decodificar(valor: str | None) -> str:
    return str(make_header(decode_header(valor))) if valor else ""


class Gmail:
    def __init__(self, conf: dict):
        usuario = os.environ.get(conf["usuario_env"])
        clave = os.environ.get(conf["password_env"])
        if not usuario or not clave:
            raise SystemExit(
                f"Faltan las variables {conf['usuario_env']} y/o {conf['password_env']} "
                "(ver README: contraseña de aplicación de Google)"
            )
        self.conf = conf
        self.imap = imaplib.IMAP4_SSL("imap.gmail.com")
        self.imap.login(usuario, clave.replace(" ", ""))
        self.imap.select(f'"{conf.get("carpeta", "INBOX")}"')

    def adjuntos(self):
        """Itera los adjuntos PDF, ZIP y Excel de los mails que cumplen la búsqueda configurada."""
        estado, datos = self.imap.uid("SEARCH", "X-GM-RAW", f'"{self.conf["busqueda"]}"')
        if estado != "OK":
            raise RuntimeError(f"Búsqueda IMAP fallida: {datos}")
        for uid in datos[0].split():
            estado, partes = self.imap.uid("FETCH", uid, "(BODY.PEEK[])")
            if estado != "OK" or not partes or partes[0] is None:
                continue
            msg = email.message_from_bytes(partes[0][1])
            try:
                fecha = parsedate_to_datetime(msg["Date"]).date()
            except (TypeError, ValueError):
                fecha = None
            for parte in msg.walk():
                nombre = _decodificar(parte.get_filename())
                if not nombre.lower().endswith(EXTENSIONES) and parte.get_content_type() != "application/pdf":
                    continue
                contenido = parte.get_payload(decode=True)
                if not contenido:
                    continue
                yield Adjunto(
                    uid=uid.decode(),
                    message_id=(msg.get("Message-ID") or uid.decode()).strip(),
                    fecha_mail=fecha,
                    remitente=_decodificar(msg.get("From")),
                    asunto=_decodificar(msg.get("Subject")),
                    archivo=nombre if nombre.lower().endswith(EXTENSIONES) else f"{nombre or 'adjunto'}.pdf",
                    contenido=contenido,
                )

    def etiquetar(self, uid: str) -> None:
        etiqueta = self.conf.get("etiqueta_procesado")
        if etiqueta:
            self.imap.uid("STORE", uid, "+X-GM-LABELS", f'("{etiqueta}")')

    def cerrar(self) -> None:
        try:
            self.imap.logout()
        except Exception:
            pass
