// Países tal como aparecen en la planilla "Venta x PAIS" -> código ISO (bandera y mapa) y ubicación.
// Algunos nombres distintos del mismo país se unifican (Inglaterra / Gran Bretaña, Turquía / Turquia).

export type InfoPais = { iso2: string; num: string; nombre: string; lat: number; lon: number }

const P = (iso2: string, num: string, nombre: string, lat: number, lon: number): InfoPais => ({ iso2, num, nombre, lat, lon })

const TABLA: Record<string, InfoPais> = {
  ARGENTINA: P('ar', '032', 'Argentina', -34, -64),
  'ESTADOS UNIDOS': P('us', '840', 'Estados Unidos', 39, -98),
  BRASIL: P('br', '076', 'Brasil', -10, -52),
  URUGUAY: P('uy', '858', 'Uruguay', -33, -56),
  MEXICO: P('mx', '484', 'México', 23, -102),
  PERU: P('pe', '604', 'Perú', -10, -76),
  CHILE: P('cl', '152', 'Chile', -33, -71),
  ALEMANIA: P('de', '276', 'Alemania', 51, 10),
  COLOMBIA: P('co', '170', 'Colombia', 4, -73),
  CANADA: P('ca', '124', 'Canadá', 57, -101),
  ITALIA: P('it', '380', 'Italia', 42.8, 12.8),
  ESPANA: P('es', '724', 'España', 40, -4),
  CHINA: P('cn', '156', 'China', 35, 103),
  PANAMA: P('pa', '591', 'Panamá', 9, -80),
  'GRAN BRETANA': P('gb', '826', 'Reino Unido', 54, -2),
  INGLATERRA: P('gb', '826', 'Reino Unido', 54, -2),
  ISRAEL: P('il', '376', 'Israel', 31, 35),
  AUSTRALIA: P('au', '036', 'Australia', -25, 134),
  FRANCIA: P('fr', '250', 'Francia', 46, 2),
  INDIA: P('in', '356', 'India', 21, 78),
  PARAGUAY: P('py', '600', 'Paraguay', -23, -58),
  JAPON: P('jp', '392', 'Japón', 36, 138),
  'COSTA RICA': P('cr', '188', 'Costa Rica', 10, -84),
  VENEZUELA: P('ve', '862', 'Venezuela', 7, -66),
  ECUADOR: P('ec', '218', 'Ecuador', -1.5, -78),
  BOLIVIA: P('bo', '068', 'Bolivia', -17, -65),
  PORTUGAL: P('pt', '620', 'Portugal', 39.5, -8),
  SUIZA: P('ch', '756', 'Suiza', 47, 8),
  'SUECIA (SWITZELAND)': P('ch', '756', 'Suiza', 47, 8), // así figura en la planilla ("Switzerland")
  RUSIA: P('ru', '643', 'Rusia', 60, 90),
  HOLANDA: P('nl', '528', 'Países Bajos', 52.2, 5.3),
  BELGICA: P('be', '056', 'Bélgica', 50.6, 4.6),
  'ISLAS CAIMAN': P('ky', '136', 'Islas Caimán', 19.3, -81.3),
  GUATEMALA: P('gt', '320', 'Guatemala', 15.5, -90.3),
  'COREA DEL SUR': P('kr', '410', 'Corea del Sur', 36.5, 127.8),
  SINGAPUR: P('sg', '702', 'Singapur', 1.35, 103.8),
  AUSTRIA: P('at', '040', 'Austria', 47.6, 14.1),
  SUECIA: P('se', '752', 'Suecia', 62, 15),
  'REPUBLICA DOMINICANA': P('do', '214', 'República Dominicana', 18.7, -70.2),
  'EMIRATOS ARABES': P('ae', '784', 'Emiratos Árabes Unidos', 24, 54),
  IRLANDA: P('ie', '372', 'Irlanda', 53.4, -8),
  HONDURAS: P('hn', '340', 'Honduras', 15, -86.5),
  'EL SALVADOR': P('sv', '222', 'El Salvador', 13.8, -88.9),
  POLONIA: P('pl', '616', 'Polonia', 52, 19),
  TURQUIA: P('tr', '792', 'Turquía', 39, 35),
  DINAMARCA: P('dk', '208', 'Dinamarca', 56, 10),
  'PUERTO RICO': P('pr', '630', 'Puerto Rico', 18.2, -66.5),
  FILIPINAS: P('ph', '608', 'Filipinas', 12.9, 122),
  MALASIA: P('my', '458', 'Malasia', 4.2, 102),
  'REPUBLICA CHECA': P('cz', '203', 'República Checa', 49.8, 15.5),
  GRECIA: P('gr', '300', 'Grecia', 39, 22),
  CUBA: P('cu', '192', 'Cuba', 21.5, -78),
  NORUEGA: P('no', '578', 'Noruega', 64, 11),
  'NUEVA ZELANDA': P('nz', '554', 'Nueva Zelanda', -41, 174),
  IRAN: P('ir', '364', 'Irán', 32, 53),
  FINLANDIA: P('fi', '246', 'Finlandia', 64, 26),
  CROACIA: P('hr', '191', 'Croacia', 45.1, 15.2),
  UCRANIA: P('ua', '804', 'Ucrania', 49, 32),
  HUNGRIA: P('hu', '348', 'Hungría', 47.2, 19.5),
  ESLOVENIA: P('si', '705', 'Eslovenia', 46.1, 15),
  BULGARIA: P('bg', '100', 'Bulgaria', 42.7, 25.5),
  LUXEMBURGO: P('lu', '442', 'Luxemburgo', 49.8, 6.1),
  MONACO: P('mc', '492', 'Mónaco', 43.7, 7.4),
  EGIPTO: P('eg', '818', 'Egipto', 26.8, 30.8),
  TAIWAN: P('tw', '158', 'Taiwán', 23.7, 121),
  QATAR: P('qa', '634', 'Qatar', 25.3, 51.2),
  ISLANDIA: P('is', '352', 'Islandia', 65, -18),
  'TRINIDAD Y TOBAGO': P('tt', '780', 'Trinidad y Tobago', 10.7, -61.2),
  ANDORRA: P('ad', '020', 'Andorra', 42.5, 1.6),
  ESLOVAQUIA: P('sk', '703', 'Eslovaquia', 48.7, 19.7),
  PAKISTAN: P('pk', '586', 'Pakistán', 30, 69),
  KENIA: P('ke', '404', 'Kenia', 0, 38),
  VIETNAM: P('vn', '704', 'Vietnam', 16, 107.8),
  SURINAME: P('sr', '740', 'Surinam', 4, -56),
  LETONIA: P('lv', '428', 'Letonia', 56.9, 24.6),
  SIRIA: P('sy', '760', 'Siria', 35, 38.5),
  RUMANIA: P('ro', '642', 'Rumania', 45.9, 25),
}

export function normalizarNombre(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
}

/** Información del país o null para agrupaciones sin país ("OTROS", "ÁFRICA"). */
export function infoPais(nombre: string): InfoPais | null {
  return TABLA[normalizarNombre(nombre)] ?? null
}

/** Nombre para mostrar: el del país si se reconoce, si no el de la planilla con mayúscula inicial. */
export function nombrePais(nombre: string) {
  const i = infoPais(nombre)
  if (i) return i.nombre
  const t = nombre.toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function nombreContinente(c: string) {
  const n = normalizarNombre(c)
  return ({ AMERICA: 'América', EUROPA: 'Europa', ASIA: 'Asia', OCEANIA: 'Oceanía', AFRICA: 'África' } as Record<string, string>)[n] ?? 'Sin referencia'
}
