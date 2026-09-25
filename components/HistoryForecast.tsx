'use client'
import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BonvoyDia, HFDia, Hotel } from '@/lib/datos'
import { dinero, entero, fechaCorta, fechaLarga, mesCorto, pct, variacionTexto } from '@/lib/formato'
import { Medidor } from './ResumenEjecutivo'
import { AvisoDemo, Selector, Tarjeta } from './ui'
import { COLORES } from './colores'

type Props = { demo: boolean; hoteles: Hotel[]; hfDias: HFDia[]; bonvoyDias: BonvoyDia[] }

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const NIVELES = ['Ambassador Elite (AMB)', 'Titanium Elite (TTM)', 'Platinum Elite (PLT)', 'Gold Elite (GLD)', 'Silver Elite (SLR)', 'Member (MRD)']
const COLOR_NIVEL: Record<string, string> = {
  'Ambassador Elite (AMB)': '#1c1c1c', 'Titanium Elite (TTM)': '#5f5f5f', 'Platinum Elite (PLT)': '#a3a3a3',
  'Gold Elite (GLD)': '#c9a13b', 'Silver Elite (SLR)': '#c0c0c0', 'Member (MRD)': '#b5121b',
}
const FORECAST = '#8fb3e0'
const diaSemana = (f: string) => DIAS[new Date(f + 'T12:00:00Z').getUTCDay()]
const disponibles = (d: HFDia) => (d.pct > 0 ? d.occ / d.pct : 0)
const menos364 = (f: string) => new Date(new Date(f + 'T12:00:00Z').getTime() - 364 * 864e5).toISOString().slice(0, 10)

function semaforo(occ: number) {
  return occ >= 70 ? '#1a8f2e' : occ >= 60 ? '#e0a100' : '#b5121b'
}

function agregado(ds: HFDia[]) {
  const occ = ds.reduce((s, d) => s + d.occ, 0)
  const disp = ds.reduce((s, d) => s + disponibles(d), 0)
  const rev = ds.reduce((s, d) => s + d.rev, 0)
  return { occ, pct: disp ? (100 * occ) / disp : 0, adr: occ ? rev / occ : 0, rev }
}

export default function HistoryForecast({ demo, hoteles, hfDias, bonvoyDias }: Props) {
  const activos = hoteles.filter((h) => h.activo && hfDias.some((d) => d.h === h.id))
  const [hotel, setHotel] = useState(activos[0]?.id ?? '')
  const delHotel = useMemo(() => hfDias.filter((d) => d.h === hotel), [hfDias, hotel])
  const hoy = delHotel.find((d) => d.tipo === 'Forecast')?.f ?? delHotel[delHotel.length - 1]?.f ?? ''
  const meses = [...new Set(delHotel.map((d) => d.f.slice(0, 7)))].sort().reverse()
  const [mesSel, setMesSel] = useState('')
  const mes = meses.includes(mesSel) ? mesSel : hoy.slice(0, 7)
  const [diaSel, setDiaSel] = useState('')
  const [filtroDia, setFiltroDia] = useState('todos')

  const delMes = delHotel.filter((d) => d.f.startsWith(mes))
  const hist = agregado(delMes.filter((d) => d.tipo === 'History'))
  const fc = agregado(delMes.filter((d) => d.tipo === 'Forecast'))
  const tot = agregado(delMes)
  const conPct = delMes.map((d) => ({ d, occ: 100 * d.pct }))
  const minimo = conPct.reduce((m, x) => (x.occ < m.occ ? x : m), conPct[0] ?? { d: null, occ: 0 })
  const maximo = conPct.reduce((m, x) => (x.occ > m.occ ? x : m), conPct[0] ?? { d: null, occ: 0 })
  const porFecha = useMemo(() => new Map(delHotel.map((d) => [d.f, d])), [delHotel])
  const dia = porFecha.get(diaSel) ?? porFecha.get(hoy) ?? delMes[0]
  const bonvoy = NIVELES.map((n) => ({ nivel: n, n: bonvoyDias.filter((b) => b.h === hotel && b.f === dia?.f && b.nivel === n).reduce((s, b) => s + b.n, 0) }))
    .filter((x) => x.n > 0)
  const adrMes = tot.adr

  const grafico = delMes.map((d) => ({
    f: d.f, etiqueta: `${diaSemana(d.f).slice(0, 2)} ${fechaCorta(d.f)}`, occ: d.occ, rev: d.rev,
    color: d.f === hoy ? COLORES.acento : d.tipo === 'History' ? '#6b6b6b' : FORECAST,
  }))
  const tabla = delMes.filter((d) => filtroDia === 'todos' || diaSemana(d.f) === filtroDia)
  const maxOcc = Math.max(1, ...tabla.map((d) => d.occ))
  const maxRev = Math.max(1, ...tabla.map((d) => d.rev))
  const totTabla = agregado(tabla)

  if (!dia) return <Tarjeta><p className="text-sm text-neutral-500">Todavía no hay reportes de History & Forecast.</p></Tarjeta>

  const Dato = ({ t, v }: { t: string; v: string }) => (
    <div className="rounded-lg bg-neutral-50 p-2 text-center">
      <div className="text-[11px] text-neutral-500">{t}</div>
      <div className="text-lg font-semibold tabular-nums">{v}</div>
    </div>
  )

  return (
    <div className="space-y-5">
      {demo && <AvisoDemo />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo">History &amp; Forecast</h1>
          <p className="text-sm text-neutral-500">Real hasta el {fechaLarga(menosUno(hoy))} y reservas confirmadas desde el {fechaLarga(hoy)} · USD</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Selector etiqueta="Hotel" valor={hotel} onChange={(h) => { setHotel(h); setMesSel(''); setDiaSel('') }}
            opciones={activos.map((h) => ({ valor: h.id, texto: h.nombre }))} />
          <Selector etiqueta="Mes" valor={mes} onChange={(m) => { setMesSel(m); setDiaSel('') }}
            opciones={meses.map((m) => ({ valor: m, texto: mesCorto(m) }))} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_0.8fr]">
        {[
          { t: 'Ocupación histórica', a: hist, color: '#6b6b6b', sub: 'ya ocurrido' },
          { t: 'Ocupación proyectada', a: fc, color: FORECAST, sub: 'reservas confirmadas' },
          { t: 'Ocupación del mes', a: tot, color: tot.pct >= 60 ? '#1a8f2e' : COLORES.acento, sub: 'real + proyectado' },
        ].map(({ t, a, color, sub }) => (
          <div key={t} className="tarjeta rounded-xl bg-white p-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <div className="text-sm font-semibold">{t}</div>
            <div className="mx-auto max-w-[200px]"><Medidor valor={a.pct} color={color} /></div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><div className="font-semibold tabular-nums">{entero(a.occ)}</div><div className="text-[11px] text-neutral-500">habitaciones</div></div>
              <div><div className="font-semibold tabular-nums">{dinero(a.adr, 'USD')}</div><div className="text-[11px] text-neutral-500">ADR</div></div>
            </div>
            <div className="mt-1 text-[11px] text-neutral-400">{sub}</div>
          </div>
        ))}
        <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
          <div className="tarjeta rounded-xl bg-white p-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <div className="text-xs text-neutral-500">Menor ocupación</div>
            <div className="text-2xl font-bold text-acento tabular-nums">{pct(minimo.occ, 2)}</div>
            {minimo.d && <div className="text-[11px] text-neutral-500">{diaSemana(minimo.d.f)} {fechaCorta(minimo.d.f)}</div>}
          </div>
          <div className="tarjeta rounded-xl bg-white p-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <div className="text-xs text-neutral-500">Mayor ocupación</div>
            <div className="text-2xl font-bold text-[#1a8f2e] tabular-nums">{pct(maximo.occ, 2)}</div>
            {maximo.d && <div className="text-[11px] text-neutral-500">{diaSemana(maximo.d.f)} {fechaCorta(maximo.d.f)}</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Tarjeta titulo={`${diaSemana(dia.f)} ${fechaLarga(dia.f)}`} extra={<span className="text-[11px] text-neutral-500">{dia.f === hoy ? 'hoy' : dia.tipo === 'History' ? 'real' : 'proyectado'}</span>}>
          <div className="mx-auto max-w-[200px]"><Medidor valor={100 * dia.pct} /></div>
          <div className="mb-3 text-center text-xl font-bold tabular-nums">{dinero(dia.occ ? dia.rev / dia.occ : 0, 'USD')} <span className="text-xs font-normal text-neutral-500">ADR</span></div>
          <div className="grid grid-cols-3 gap-2">
            <Dato t="Ocupadas" v={entero(dia.occ)} />
            <Dato t="Grupos" v={entero(dia.dgrp)} />
            <Dato t="Individuales" v={entero(dia.dind)} />
            <Dato t="Huéspedes" v={entero(dia.pax)} />
            <Dato t="Llegadas" v={entero(dia.arr)} />
            <Dato t="Salidas" v={entero(dia.dep)} />
          </div>
          {bonvoy.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold">Llegadas Bonvoy · {entero(bonvoy.reduce((s, b) => s + b.n, 0))}</div>
              <ul className="space-y-1 text-xs">
                {bonvoy.map((b) => (
                  <li key={b.nivel} className="flex items-center gap-2">
                    <span className="w-24 truncate">{b.nivel.replace(/ \(.*\)/, '')}</span>
                    <span className="h-3 rounded-sm" style={{ width: `${Math.max(8, 14 * b.n)}px`, background: COLOR_NIVEL[b.nivel] ?? '#a3a3a3' }} />
                    <span className="tabular-nums">{b.n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Tarjeta>

        <Tarjeta titulo="Habitaciones ocupadas e ingresos por día"
          extra={<span className="flex gap-3 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 bg-[#6b6b6b]" />real</span>
            <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 bg-acento" />hoy</span>
            <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5" style={{ background: FORECAST }} />proyectado</span>
            <span className="flex items-center gap-1"><i className="inline-block h-0.5 w-4 bg-marca" />ingresos</span>
          </span>}>
          <div className="h-80">
            <ResponsiveContainer>
              <ComposedChart data={grafico} margin={{ left: 0, right: 8 }}>
                <CartesianGrid stroke={COLORES.grilla} vertical={false} />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} minTickGap={6} />
                <YAxis yAxisId="o" tick={{ fontSize: 11 }} width={40} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => dinero(v, 'USD', true)} />
                <Tooltip formatter={(v, n) => (n === 'Ingresos alojamiento' ? dinero(Number(v), 'USD') : entero(Number(v)))} />
                <Bar yAxisId="o" dataKey="occ" name="Habitaciones ocupadas" radius={[3, 3, 0, 0]} className="cursor-pointer"
                  onClick={(_, i) => grafico[i] && setDiaSel(grafico[i].f)}>
                  {grafico.map((g) => <Cell key={g.f} fill={g.color} fillOpacity={g.f === dia.f || !diaSel ? 1 : 0.55} />)}
                </Bar>
                <Line yAxisId="r" dataKey="rev" name="Ingresos alojamiento" stroke={COLORES.principal} strokeWidth={2} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-neutral-500">Tocá una barra para ver el detalle de ese día.</p>
        </Tarjeta>
      </div>

      <Tarjeta titulo={`Detalle diario · ${mesCorto(mes)}`}
        extra={<Selector valor={filtroDia} onChange={setFiltroDia}
          opciones={[{ valor: 'todos', texto: 'Todos los días' }, ...DIAS.slice(1).concat(DIAS[0]).map((d) => ({ valor: d, texto: d }))]} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="border-b-2 border-marca text-left text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-2 pr-2">Fecha</th><th className="pr-2">Día</th><th className="pr-2" />
                <th className="w-36 pr-2">Ocupadas</th><th className="pr-2 text-right">Individ.</th><th className="pr-2 text-right">Grupos</th>
                <th className="pr-2 text-right">% Ocup.</th><th className="pr-2 text-right">Año ant.</th>
                <th className="pr-2 text-right">Llegadas</th><th className="pr-2 text-right">Salidas</th>
                <th className="w-32 pr-2 text-right">Ingresos</th><th className="pr-2 text-right">ADR</th><th className="text-right">Huéspedes</th>
              </tr>
            </thead>
            <tbody>
              {tabla.map((d) => {
                const occ = 100 * d.pct
                const ant = porFecha.get(menos364(d.f))
                const adr = d.occ ? d.rev / d.occ : 0
                return (
                  <tr key={d.f} onClick={() => setDiaSel(d.f)}
                    className={`cursor-pointer border-b border-neutral-100 hover:bg-neutral-50 ${d.f === dia.f ? 'bg-neutral-100' : ''} ${d.f === hoy ? 'border-t-2 border-t-acento' : ''}`}>
                    <td className="py-1.5 pr-2">{fechaCorta(d.f)}</td>
                    <td className="pr-2 capitalize text-neutral-600">{diaSemana(d.f)}</td>
                    <td className="pr-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${d.tipo === 'History' ? 'bg-neutral-200 text-neutral-700' : 'bg-[#dbe7f6] text-[#2d5d99]'}`}>
                        {d.tipo === 'History' ? 'Real' : 'Proy.'}
                      </span>
                    </td>
                    <td className="pr-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3.5 flex-1 rounded-sm bg-neutral-100">
                          <div className="h-3.5 rounded-sm" style={{ width: `${(100 * d.occ) / maxOcc}%`, background: d.tipo === 'History' ? '#6b6b6b' : FORECAST }} />
                        </div>
                        <span className="w-9 text-right">{entero(d.occ)}</span>
                      </div>
                    </td>
                    <td className="pr-2 text-right">{entero(d.dind)}</td>
                    <td className="pr-2 text-right">{entero(d.dgrp)}</td>
                    <td className="pr-2 text-right">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: semaforo(occ) }} />{pct(occ, 1)}
                      </span>
                    </td>
                    <td className="pr-2 text-right text-xs text-neutral-500">
                      {ant ? <span className={occ >= 100 * ant.pct ? 'text-emerald-700' : 'text-acento'}>{variacionTexto(occ - 100 * ant.pct, true)}</span> : '—'}
                    </td>
                    <td className="pr-2 text-right">{entero(d.arr)}</td>
                    <td className="pr-2 text-right">{entero(d.dep)}</td>
                    <td className="pr-2 text-right" style={{ background: `rgba(26,143,46,${(0.28 * d.rev) / maxRev})` }}>{dinero(d.rev, 'USD')}</td>
                    <td className={`pr-2 text-right ${adr >= adrMes ? 'text-emerald-700' : 'text-acento'}`}>{dinero(adr, 'USD')}</td>
                    <td className="text-right">{entero(d.pax)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-marca font-semibold">
              <tr>
                <td className="py-2" colSpan={3}>Total {filtroDia !== 'todos' ? `(${filtroDia})` : ''}</td>
                <td className="pr-2 text-right">{entero(totTabla.occ)}</td>
                <td className="pr-2 text-right">{entero(tabla.reduce((s, d) => s + d.dind, 0))}</td>
                <td className="pr-2 text-right">{entero(tabla.reduce((s, d) => s + d.dgrp, 0))}</td>
                <td className="pr-2 text-right">{pct(totTabla.pct, 2)}</td>
                <td />
                <td className="pr-2 text-right">{entero(tabla.reduce((s, d) => s + d.arr, 0))}</td>
                <td className="pr-2 text-right">{entero(tabla.reduce((s, d) => s + d.dep, 0))}</td>
                <td className="pr-2 text-right">{dinero(totTabla.rev, 'USD')}</td>
                <td className="pr-2 text-right">{dinero(totTabla.adr, 'USD')}</td>
                <td className="text-right">{entero(tabla.reduce((s, d) => s + d.pax, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">
          Semáforo de ocupación: verde desde 70%, amarillo 60–70%, rojo debajo de 60%. ADR en verde si supera el promedio del mes.
          &quot;Año ant.&quot; compara con el mismo día de la semana del año anterior.
        </p>
      </Tarjeta>
    </div>
  )
}

function menosUno(f: string) {
  return f ? new Date(new Date(f + 'T12:00:00Z').getTime() - 864e5).toISOString().slice(0, 10) : f
}
