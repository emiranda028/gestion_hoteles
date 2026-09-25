"""Nombres de países (como suelen aparecer en los PMS) -> código ISO 3166-1 alfa-2."""
import unicodedata

_PAISES = {
    "AR": ["argentina", "arg"],
    "BR": ["brasil", "brazil", "bra"],
    "UY": ["uruguay", "ury", "uru"],
    "CL": ["chile", "chl"],
    "PY": ["paraguay", "pry", "par"],
    "BO": ["bolivia", "bol"],
    "PE": ["peru", "per"],
    "CO": ["colombia", "col"],
    "EC": ["ecuador", "ecu"],
    "VE": ["venezuela", "ven"],
    "MX": ["mexico", "mex"],
    "US": ["estados unidos", "eeuu", "ee.uu.", "usa", "united states", "us"],
    "CA": ["canada", "can"],
    "CR": ["costa rica"],
    "PA": ["panama"],
    "CU": ["cuba"],
    "DO": ["republica dominicana", "dominicana"],
    "ES": ["espana", "spain", "esp"],
    "IT": ["italia", "italy", "ita"],
    "FR": ["francia", "france", "fra"],
    "DE": ["alemania", "germany", "deu", "ale"],
    "GB": ["reino unido", "inglaterra", "united kingdom", "uk", "gbr"],
    "IE": ["irlanda", "ireland"],
    "PT": ["portugal", "prt"],
    "NL": ["paises bajos", "holanda", "netherlands"],
    "BE": ["belgica", "belgium"],
    "CH": ["suiza", "switzerland"],
    "AT": ["austria"],
    "SE": ["suecia", "sweden"],
    "NO": ["noruega", "norway"],
    "DK": ["dinamarca", "denmark"],
    "FI": ["finlandia", "finland"],
    "PL": ["polonia", "poland"],
    "RU": ["rusia", "russia"],
    "IL": ["israel", "isr"],
    "CN": ["china", "chn"],
    "JP": ["japon", "japan"],
    "KR": ["corea del sur", "corea", "south korea"],
    "IN": ["india"],
    "AU": ["australia", "aus"],
    "NZ": ["nueva zelanda", "new zealand"],
    "ZA": ["sudafrica", "south africa"],
}

_INDICE = {}
for _codigo, _nombres in _PAISES.items():
    for _n in _nombres:
        _INDICE[_n] = _codigo


def _normalizar(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return " ".join(t.lower().strip().split())


def a_iso2(nombre: str) -> str | None:
    """Devuelve el código ISO2 o None si no se reconoce (se guarda igual con el nombre)."""
    n = _normalizar(nombre)
    if n in _INDICE:
        return _INDICE[n]
    if len(n) == 2 and n.upper() in _PAISES:
        return n.upper()
    return None
