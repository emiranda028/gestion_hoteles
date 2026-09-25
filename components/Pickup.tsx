'use client'
import { useMemo, useState } from 'react'
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { DiaForecast, FotoPickup, Hotel } from '@/lib/datos'
import { type Dia, sumarDias } from '@/lib/kpi'
import { dinero, entero, fechaCorta, fechaLarga, mesCorto, pct } from '@/lib/formato'
import { AvisoDemo, Kpi, Segmentado, Selector, Tarjeta } from './ui'

type Props = { demo: boolean; hoteles: Hotel[]; pickup: FotoPickup[]; forecast: DiaForecast[]; dias: Dia[] }
const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function Pickup({ demo, hoteles, pickup, forecast, dias }: Props) {
  const conDatos = hoteles.filter((h) => pickup.some((p) => p.h === h.id))
  const [hotel, setHotel] = useState(conDatos[0]?.id ?? '')
  const [horizonte, setHorizonte] = useState<'30' | '60' | '90'>('30')

  const fotos = useMemo(() => pickup.filter((p) => p.h === hotel).sort((a, b) => a.r.localeCompare(b.r)), [pickup, hotel])
  const ultima = fotos[fotos.length - 1]?.r ?? ''
  const meses = [...new Set(fotos.filter((p) => p.r === ultima).map((p) => p.mes))].sort()
  const [mesSel, setMesSel] = useState<string>('')
  const mes = meses.includes(mesSel) ? mesSel : meses[0] ?? ''

  // real del mismo mes del año anterior (para comparar el on the books)
  const realAnterior = (m: string) => {
    const ant = `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`
    const ds = dias.filter((d) => d.h === hotel && d.f.startsWith(ant))
    const noches = ds.reduce((s, d) => s + d.ocup, 0)
    return ds.length ? { noches, rev: ds.reduce((s, d) => s + d.ingHab, 0) } : null
  }

  const resumen = meses.map((m) => {
    const serie = fotos.filter((p) => p.mes === m)
    const hoy = serie[serie.length - 1]
    const buscar = (n: number) => {
      const f = sumarDias(hoy.r, -n)
      return [...serie].reverse().find((p) => p.r <= f)
    }
    const ayer = serie[serie.length - 2]
    const semana = buscar(7)
    return { m, hoy, pu1: ayer ? hoy.noches - ayer.noches : null, pu7: semana ? hoy.noches - semana.noches : null, ant: realAnterior(m) }
  })

  const evolucion = useMemo(() => {
    const serie = fotos.filter((p) => p.mes === mes)
    return serie.map((p, i) => ({
      etiqueta: fechaCorta(p.r),
      noches: p.noches,
      pickup: i ? p.noches - serie[i - 1].noches : 0,
      grupos: p.grp,
    }))
  }, [fotos, mes])

  const proximos = useMemo(() => {
    const porFecha = new Map(dias.filter((d) => d.h === hotel).map((d) => [d.f, d]))
    const fc = forecast.filter((d) => d.h === hotel).slice(0, Number(horizonte))
    return fc.map((d) => {
      const ant = porFecha.get(sumarDias(d.f, -364)) // mismo día de la semana del año anterior
      return {
        etiqueta: `${DIAS_SEM[new Date(d.f + 'T12:00:00Z').getUTCDay()]} ${fechaCorta(d.f)}`,
        occ: d.disp ? (100 * d.ocup) / d.disp : 0,
        grupos: d.disp ? (100 * d.grp) / d.disp : 0,
        anterior: ant && ant.disp ? (100 * ant.ocup) / ant.disp : undefined,
        adr: d.ocup ? d.ingHab / d.ocup : 0,
      }
    })
  }, [forecast, dias, hotel, horizonte])

  if (!conDatos.length) {
    return <Tarjeta><p className="text-sm text-slate-500">Todavía no hay reportes de History & Forecast.</p></Tarjeta>
  }

  return (
    <div className="space-y-4">
      {demo && <AvisoDemo />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Forecast y pick up</h1>
          <p className="text-sm text-slate-500">On the books según el History & Forecast del {ultima && fechaLarga(ultima)}. Montos en USD.</p>
        </div>
        <Selector etiqueta="Hotel" valor={hotel} onChange={setHotel}
          opciones={conDatos.map((h) => ({ valor: h.id, texto: h.nombre }))} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {resumen.map(({ m, hoy, pu1, pu7, ant }) => (
          <button key={m} type="button" onClick={() => setMesSel(m)} className="text-left">
            <Kpi
              titulo={`${mesCorto(m)} · ${m === mes ? 'seleccionado' : 'ver evolución'}`}
              valor={`${entero(hoy.noches)} noches`}
              detalle={`${pct(hoy.occ * 100)} ocup. · ADR ${dinero(hoy.noches ? hoy.rev / hoy.noches : 0, 'USD')} · ${dinero(hoy.rev, 'USD', true)}` +
                (ant ? ` · año ant. real ${entero(ant.noches)}` : '')}
              variacion={{
                texto: `pick up ${pu1 === null ? '—' : (pu1 >= 0 ? '+' : '') + entero(pu1)} día · ${pu7 === null ? '—' : (pu7 >= 0 ? '+' : '') + entero(pu7)} semana`,
                valor: pu7 ?? pu1,
              }}
            />
          </button>
        ))}
      </div>

      <Tarjeta titulo={`Evolución del on the books · ${mes && mesCorto(mes)}`}>
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={evolucion} margin={{ left: 0, right: 8 }}>
              <CartesianGrid stroke="#eef2f4" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} minTickGap={16} />
              <YAxis yAxisId="n" tick={{ fontSize: 11 }} width={50} />
              <YAxis yAxisId="p" orientation="right" tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v) => entero(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="p" dataKey="pickup" name="Pick up del día" fill="#e36414" radius={[2, 2, 0, 0]} />
              <Line yAxisId="n" dataKey="noches" name="Noches on the books" stroke="#0f4c5c" strokeWidth={2} dot={false} />
              <Line yAxisId="n" dataKey="grupos" name="De grupos" stroke="#94a3b8" strokeDasharray="4 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Ocupación de los próximos días"
        extra={<Segmentado valor={horizonte} onChange={setHorizonte}
          opciones={[{ valor: '30', texto: '30 días' }, { valor: '60', texto: '60 días' }, { valor: '90', texto: '90 días' }]} />}>
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={proximos} margin={{ left: 0, right: 8 }}>
              <CartesianGrid stroke="#eef2f4" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} minTickGap={8} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v, n) => (n === 'ADR' ? dinero(Number(v), 'USD') : pct(Number(v)))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="occ" name="Ocupación on the books" fill="#0f4c5c" radius={[2, 2, 0, 0]} />
              <Bar dataKey="grupos" name="De grupos" fill="#e36414" radius={[2, 2, 0, 0]} />
              <Line dataKey="anterior" name="Real mismo día año anterior" stroke="#94a3b8" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          La comparación usa el mismo día de la semana del año anterior (364 días antes).
        </p>
      </Tarjeta>
    </div>
  )
}
