'use client'
import { useState } from 'react'
import type { FlashHotel, Hotel } from '@/lib/datos'
import { dinero, fechaLarga, pct, variacionTexto } from '@/lib/formato'
import { Segmentado, Tarjeta } from './ui'

type Trio = [number | null, number | null, number | null]
const CERO: Trio = [0, 0, 0]

/** Cifras base (sumables) de un flash, para poder consolidar la cartera. */
function base(c: FlashHotel['c'] | null) {
  const v = (k: string): Trio => (c?.[k] as Trio) ?? CERO
  return {
    hab: v('Total Rooms in Hotel'),
    ocup: v('Rooms Occupied minus House Use'),
    rev: v('Room Revenue'),
    tot: c?.['Total Revenue'] ?? c?.['Ventas Totales'] ?? CERO,
  }
}

function sumar(xs: ReturnType<typeof base>[]) {
  const s = (k: keyof ReturnType<typeof base>) =>
    [0, 1, 2].map((i) => xs.reduce((a, x) => a + (x[k][i] ?? 0), 0)) as Trio
  return { hab: s('hab'), ocup: s('ocup'), rev: s('rev'), tot: s('tot') }
}

function kpis(b: ReturnType<typeof base>) {
  return [0, 1, 2].map((i) => {
    const hab = b.hab[i] ?? 0, ocup = b.ocup[i] ?? 0, rev = b.rev[i] ?? 0
    return { occ: hab ? (100 * ocup) / hab : 0, adr: ocup ? rev / ocup : 0, revpar: hab ? rev / hab : 0, tot: b.tot[i] ?? 0 }
  })
}

type Grupo = 'occ' | 'adr' | 'revpar' | 'tot'
const GRUPOS: { valor: Grupo; texto: string }[] = [
  { valor: 'occ', texto: 'Ocupación' }, { valor: 'adr', texto: 'ADR' }, { valor: 'revpar', texto: 'RevPAR' }, { valor: 'tot', texto: 'Ingresos' },
]

export default function FlashDelDia({ flash, hoteles }: { flash: FlashHotel[]; hoteles: Hotel[] }) {
  // en el celular se ve un indicador por vez (se elige arriba); en la compu, todos
  const [grupo, setGrupo] = useState<Grupo>('occ')
  const vis = (g: Grupo) => (g === grupo ? '' : 'hidden md:table-cell')
  let filas = hoteles
    .filter((h) => h.activo)
    .map((h) => ({ h, f: flash.find((x) => x.h === h.id) }))
    .filter((x): x is { h: Hotel; f: FlashHotel } => !!x.f)
  const ultima = filas.reduce((m, x) => (x.f.fecha > m ? x.f.fecha : m), '')
  // un hotel que no manda el flash hace más de una semana (p. ej. dado de baja) no se muestra
  const limite = new Date(new Date(ultima || '2000-01-01').getTime() - 7 * 864e5).toISOString().slice(0, 10)
  filas = filas.filter((x) => x.f.fecha >= limite)
  if (!filas.length) return null
  const fecha = ultima
  const deHoy = filas.filter((x) => x.f.fecha === fecha)
  const total = {
    act: kpis(sumar(deHoy.map((x) => base(x.f.c)))),
    ant: deHoy.every((x) => x.f.anterior) ? kpis(sumar(deHoy.map((x) => base(x.f.anterior)))) : null,
  }

  const Celda = ({ v, ant, tipo, g }: { v: number; ant?: number | null; tipo: 'pct' | 'usd' | 'usdk'; g: Grupo }) => {
    const txt = tipo === 'pct' ? pct(v) : dinero(v, 'USD', tipo === 'usdk')
    const dif = ant === undefined || ant === null ? null : tipo === 'pct' ? v - ant : ant ? (v - ant) / ant : null
    return (
      <td className={`py-1.5 pl-3 text-right ${vis(g)}`}>
        <div>{txt}</div>
        {dif !== null && (
          <div className={`text-[11px] ${dif >= 0 ? 'text-emerald-600' : 'text-acento'}`}>
            {variacionTexto(dif, tipo === 'pct')}
          </div>
        )}
      </td>
    )
  }

  const Fila = ({ nombre, act, ant, fechaFila, fuerte }: {
    nombre: string; act: ReturnType<typeof kpis>; ant: ReturnType<typeof kpis> | null; fechaFila?: string; fuerte?: boolean
  }) => (
    <tr className={`border-t border-neutral-100 align-top ${fuerte ? 'font-semibold' : ''}`}>
      <td className="py-1.5 pr-3">
        {nombre}
        {fechaFila && fechaFila !== fecha && <div className="text-[11px] font-normal text-acento">al {fechaLarga(fechaFila)}</div>}
      </td>
      {[0, 1, 2].map((i) => <Celda key={`o${i}`} g="occ" v={act[i].occ} ant={ant?.[i].occ} tipo="pct" />)}
      {[0, 1, 2].map((i) => <Celda key={`a${i}`} g="adr" v={act[i].adr} ant={ant?.[i].adr} tipo="usd" />)}
      {[0, 1].map((i) => <Celda key={`r${i}`} g="revpar" v={act[i].revpar} ant={ant?.[i].revpar} tipo="usd" />)}
      {[0, 1, 2].map((i) => <Celda key={`t${i}`} g="tot" v={act[i].tot} ant={ant?.[i].tot} tipo="usdk" />)}
    </tr>
  )

  const cab = (t: string, n: number, g: Grupo) => <th colSpan={n} className={`border-l border-neutral-100 py-1 pl-3 text-center ${vis(g)}`}>{t}</th>
  return (
    <Tarjeta titulo={`Manager Flash · ${fechaLarga(fecha)}`}
      extra={<span className="text-xs text-neutral-500">Día · mes a la fecha · año a la fecha, vs. mismo día del año anterior</span>}>
      <div className="mb-3 md:hidden"><Segmentado valor={grupo} onChange={setGrupo} opciones={GRUPOS} /></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs uppercase text-neutral-500">
            <tr>
              <th />
              {cab('Ocupación', 3, 'occ')}{cab('ADR', 3, 'adr')}{cab('RevPAR', 2, 'revpar')}{cab('Ingresos totales', 3, 'tot')}
            </tr>
            <tr className="text-[11px]">
              <th className="py-1 text-left">Hotel</th>
              {(['occ', 'occ', 'occ', 'adr', 'adr', 'adr', 'revpar', 'revpar', 'tot', 'tot', 'tot'] as Grupo[]).map((g, i) => (
                <th key={i} className={`py-1 pl-3 text-right font-normal ${vis(g)}`}>{['Día', 'Mes', 'Año', 'Día', 'Mes', 'Año', 'Día', 'Mes', 'Día', 'Mes', 'Año'][i]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ h, f }) => (
              <Fila key={h.id} nombre={h.nombre} fechaFila={f.fecha} act={kpis(base(f.c))}
                ant={f.anterior ? kpis(base(f.anterior)) : null} />
            ))}
            {deHoy.length > 1 && <Fila nombre="Total cartera" act={total.act} ant={total.ant} fuerte />}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  )
}
