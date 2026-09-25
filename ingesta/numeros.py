"""Conversión de números escritos en formato argentino/español o anglosajón."""
import re

_LIMPIAR = re.compile(r"[^\d,.\-]")


def a_numero(texto: str | None) -> float | None:
    """Convierte '1.234.567,89', '1,234,567.89', '$ 12.500', '85,3 %' o '(1.200)' en float.

    Reglas: si aparecen ambos separadores, el último que aparece es el decimal.
    Si aparece uno solo repetido, es separador de miles. Si aparece uno solo una
    vez seguido de exactamente 3 dígitos, se toma como miles (caso '12.500').
    """
    if texto is None:
        return None
    t = str(texto).strip()
    if not t:
        return None
    negativo = t.startswith("(") and t.endswith(")")
    t = _LIMPIAR.sub("", t)
    if t.startswith("-"):
        negativo, t = True, t[1:]
    t = t.replace("-", "")
    if not t or not any(c.isdigit() for c in t):
        return None

    coma, punto = t.rfind(","), t.rfind(".")
    if coma >= 0 and punto >= 0:
        decimal = "," if coma > punto else "."
        miles = "." if decimal == "," else ","
        t = t.replace(miles, "").replace(decimal, ".")
    elif coma >= 0 or punto >= 0:
        sep = "," if coma >= 0 else "."
        partes = t.split(sep)
        if len(partes) > 2 or (len(partes[-1]) == 3 and partes[0] not in ("", "0")):
            t = t.replace(sep, "")
        else:
            t = t.replace(sep, ".")
    valor = float(t)
    return -valor if negativo else valor
