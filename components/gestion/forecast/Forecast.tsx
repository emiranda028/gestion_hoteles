'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { arbol, mesesConReal, sumar, type Escenario } from '@/lib/gestion/forecast/calculo'
import { MESES_LARGOS, clave, type Anio, type Codigo } from '@/lib/gestion/forecast/modelo'
import { Encabezado, Pestanas, SelectorHotel } from '../comunes'
import { Segmentado } from '../../ui'
import Editar from './Editar'
import MesAMes from './MesAMes'
import ResumenForecast from './Resumen'
import Segmentos from './Segmentos'

export type Props = {
  hotel: { id: string; nombre: string; habitaciones: number }; hoteles: { id: string; nombre: string }[]
  anio: number; estructura: Codigo[]; actual: Anio; previo?: Anio
  tc: Record<string, number>; opera: Record<string, { rn: number; rev: number }>
  usuario: { nombre: string; rol: string }
}
export type Periodo = 'mes' | 'acumulado' | 'anio'
export type Moneda = 'USD' | 'ARS'

/** Todo lo que necesitan las solapas para calcular con las mismas reglas. */
export function useContexto(p: Props, periodo: Periodo, mes: number) {
  return useMemo(() => {
    const cerrados = mesesConReal(p.actual)
    const cods = p.estructura.map(clave)
    const ultimoBna = Object.entries(p.tc).sort()[Object.keys(p.tc).length - 1]?.[1] ?? null
    const mm = (m: number) => String(m + 1).padStart(2, '0')
    const tc = (esc: Escenario, m: number): number | null => {
      if (esc === 'anterior') return p.tc[`${p.anio - 1}-${mm(m)}`] ?? null
      const real = p.tc[`${p.anio}-${mm(m)}`]
      if (esc === 'budget') return p.actual.tcBudget[m] ?? real ?? ultimoBna
      if (cerrados[m] || esc === 'real') return real ?? p.actual.tcBudget[m] ?? ultimoBna
      return p.actual.tcBudget[m] ?? ultimoBna
    }
    const meses = periodo === 'mes' ? [mes] : periodo === 'acumulado' ? Array.from({ length: mes + 1 }, (_, i) => i) : Array.from({ length: 12 }, (_, i) => i)
    const abiertos = meses.some((m) => !cerrados[m])
    const total = (esc: Escenario, claves = cods, ms = meses) => sumar(claves, ms, esc, p.actual, p.previo, cerrados, tc)
    return { cerrados, cods, tc, meses, abiertos, total, arbol: arbol(p.estructura), etiquetaActual: abiertos ? 'Forecast' : 'Real' }
  }, [p, periodo, mes])
}

export default function Forecast(p: Props) {
  const cerrados = mesesConReal(p.actual)
  const ultimoCerrado = cerrados.lastIndexOf(true)
  const [pestana, setPestana] = useState<'resumen' | 'segmentos' | 'mensual' | 'editar'>('resumen')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [mes, setMes] = useState(Math.max(0, ultimoCerrado))
  const [moneda, setMoneda] = useState<Moneda>('USD')
  const ctx = useContexto(p, periodo, mes)
  const vacio = p.estructura.length === 0 || (!Object.keys(p.actual.budget).length && !Object.keys(p.actual.real).length)
  const hoy = new Date().getFullYear()

  return (
    <div className="space-y-5">
      <Encabezado titulo="Forecast y Budget"
        bajada="Ventas de habitaciones por segmento de mercado: Real, Forecast, Budget y año anterior con las mismas reglas en todas las vistas. El Real siempre manda sobre el Forecast.">
        <SelectorHotel hoteles={p.hoteles} actual={p.hotel.id} base="/forecast" />
      </Encabezado>

      <div className="tarjeta flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-500">Año</span>
          {[hoy - 1, hoy, hoy + 1].map((a) => (
            <Link key={a} href={`/forecast?hotel=${p.hotel.id}&anio=${a}`}
              className={`rounded-full border px-3 py-1 ${a === p.anio ? 'border-marca bg-marca text-white' : 'border-neutral-300 bg-white hover:border-neutral-500'}`}>
              {a}{a === hoy + 1 ? ' (Budget)' : ''}
            </Link>
          ))}
          <span className="ml-2 text-xs text-neutral-500">
            {ultimoCerrado >= 0 ? `Real cargado hasta ${MESES_LARGOS[ultimoCerrado]}` : 'Sin Real cargado'}
            {p.previo ? '' : ` · sin datos de ${p.anio - 1}`}
          </span>
        </div>
        {pestana !== 'editar' && !vacio && (
          <div className="flex flex-wrap items-center gap-2">
            <Segmentado valor={periodo} onChange={setPeriodo} opciones={[{ valor: 'mes', texto: 'Mes' }, { valor: 'acumulado', texto: 'Acumulado' }, { valor: 'anio', texto: 'Año' }]} />
            {periodo !== 'anio' && (
              <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm">
                {MESES_LARGOS.map((m, i) => <option key={m} value={i}>{periodo === 'acumulado' ? `enero a ${m}` : m}{cerrados[i] ? '' : ' (forecast)'}</option>)}
              </select>
            )}
            <Segmentado valor={moneda} onChange={setMoneda} opciones={[{ valor: 'USD', texto: 'USD' }, { valor: 'ARS', texto: 'ARS' }]} />
          </div>
        )}
      </div>

      <Pestanas valor={pestana} onChange={setPestana} opciones={[
        { valor: 'resumen', texto: 'Resumen' },
        { valor: 'segmentos', texto: 'Por segmento' },
        { valor: 'mensual', texto: 'Mes a mes' },
        { valor: 'editar', texto: 'Cargar y editar' },
      ]} />

      {vacio && pestana !== 'editar' ? (
        <div className="tarjeta rounded-xl bg-white p-10 text-center shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <div className="text-4xl">📊</div>
          <h2 className="mt-2 text-lg font-bold">Todavía no hay datos de {p.anio}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">Cargá el Budget y el Real con las mismas planillas de siempre desde “Cargar y editar”.</p>
          <button onClick={() => setPestana('editar')} className="mt-4 rounded-full bg-marca px-4 py-1.5 text-sm font-semibold text-white">Ir a cargar datos</button>
        </div>
      ) : (
        <>
          {pestana === 'resumen' && <ResumenForecast p={p} ctx={ctx} periodo={periodo} mes={mes} moneda={moneda} />}
          {pestana === 'segmentos' && <Segmentos p={p} ctx={ctx} moneda={moneda} />}
          {pestana === 'mensual' && <MesAMes p={p} ctx={ctx} moneda={moneda} />}
        </>
      )}
      {pestana === 'editar' && <Editar p={p} />}
    </div>
  )
}
