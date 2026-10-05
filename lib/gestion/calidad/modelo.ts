// Módulo Calidad: un solo modelo para los dos programas (Estándares de servicio y Autocontrol interno).
// Programa (catálogo fijo) → nodos (áreas / puntos de contacto, con subnodos) → ítems (estándar o pregunta).
// Auditoría = una evaluación de un programa en un hotel y período, con respuestas, evidencias y plan de acción.

export type Opcion = { t: string; v: number } // texto y puntaje (0 a 100)
export type Item = {
  c: string // código único
  t: string // texto del estándar o pregunta
  p: number // peso
  cat?: string // categoría transversal (estándares)
  e?: number // escala (índice en programa.escalas); por defecto 0
  m?: boolean // opción múltiple: se suman los puntajes de las opciones marcadas
}
export type Norma = {
  titulo?: string; subtitulo?: string; introduccion?: string
  objetivo?: string; procedimiento?: string; focus?: string[]; responsable?: string
  supervision?: string; tipo_control?: string; frecuencia?: string
}
export type Nodo = {
  c: string; n: string; en?: string; icono?: string
  peso?: number; opcional?: boolean
  hijos?: Nodo[]; items?: Item[]
  accion?: string // acción sugerida si no alcanza el objetivo
  norma?: Norma
}
export type Programa = { id: string; nombre: string; descripcion: string; escalas: Opcion[][]; nodos: Nodo[] }

export type Evidencia = { id: string; nombre: string; tipo: string; tamano: number; fecha: string; por: string }
export type Respuesta = {
  o?: number[] // opciones elegidas (índices); [] en múltiple = "ninguna"
  na?: boolean // no aplica: queda fuera del cálculo
  obs?: string
  ev?: Evidencia[]
  por?: string
  fecha?: string
}
export type EstadoAccion = 'pendiente' | 'en_curso' | 'hecha' | 'no_aplica'
export type Accion = { responsable?: string; vence?: string; estado: EstadoAccion; nota?: string }

export type Auditoria = {
  id: string
  programa: string
  hotel: string
  titulo: string // p. ej. "Autocontrol 3er trimestre 2026"
  periodo: string
  fecha: string // fecha de la evaluación
  auditor: string
  estado: 'borrador' | 'cerrada'
  ejemplo?: boolean
  respuestas: Record<string, Respuesta>
  plan: Record<string, Accion> // por código de nodo
  creada: string; creadaPor: string
  cerrada?: string; cerradaPor?: string
}

export const OBJETIVO = 0.85
export const ESTADOS_ACCION: { valor: EstadoAccion; texto: string }[] = [
  { valor: 'pendiente', texto: 'Pendiente' },
  { valor: 'en_curso', texto: 'En curso' },
  { valor: 'hecha', texto: 'Hecha' },
  { valor: 'no_aplica', texto: 'No aplica' },
]
