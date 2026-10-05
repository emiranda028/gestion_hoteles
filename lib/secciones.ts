// Solapas de la app. Cada usuario (salvo el administrador) puede tener solo algunas habilitadas.
export const SECCIONES = [
  { href: '/', texto: 'Resumen' },
  { href: '/hotel', texto: 'Hotel' },
  { href: '/flash', texto: 'Manager Flash' },
  { href: '/hf', texto: 'H&F' },
  { href: '/comparativa', texto: 'Comparativa' },
  { href: '/pickup', texto: 'Pick up' },
  { href: '/paises', texto: 'Por país' },
  { href: '/disponibilidades', texto: 'Disponibilidades' },
  { href: '/tablero', texto: 'Tablero' },
  { href: '/proyecciones', texto: 'Proyecciones' },
  { href: '/simulador', texto: 'Simulador' },
  { href: '/forecast', texto: 'Forecast y Budget' },
  { href: '/cobranzas', texto: 'Cobranzas' },
  { href: '/calidad', texto: 'Calidad' },
] as const

export type Seccion = (typeof SECCIONES)[number]['href']
