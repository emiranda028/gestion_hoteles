import autocontrol from './autocontrol.json'
import estandares from './estandares.json'
import type { Programa } from './modelo'

// Catálogos de los programas (estructura, ítems, pesos, escalas, normas y acciones sugeridas)
export const PROGRAMAS: Programa[] = [estandares as Programa, autocontrol as Programa]
export const programa = (id: string) => PROGRAMAS.find((p) => p.id === id)
