'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import mundo from 'world-atlas/countries-110m.json'
import { entero, pct } from '@/lib/formato'

export type PuntoGlobo = { clave: string; iso2: string; num: string; nombre: string; lat: number; lon: number; n: number; share: number; varAnual: number | null }

const TOPO = mundo as unknown as Topology<{ countries: GeometryCollection }>
const PAISES = feature(TOPO, TOPO.objects.countries) as FeatureCollection<Geometry, { name: string }>
const GRATICULA = geoGraticule10()
const TAM = 520

/** Rojo Marriott con intensidad logarítmica según la cantidad de huéspedes. */
function colorPara(n: number, max: number) {
  if (!n) return '#ececec'
  const t = Math.log1p(n) / Math.log1p(max)
  const mezcla = (a: number, b: number) => Math.round(a + (b - a) * t)
  return `rgb(${mezcla(246, 150)}, ${mezcla(214, 14)}, ${mezcla(214, 24)})`
}

export default function Globo({ puntos, seleccionado, onSeleccionar }: {
  puntos: PuntoGlobo[]
  seleccionado: string | null
  onSeleccionar: (clave: string | null) => void
}) {
  const [rot, setRot] = useState<[number, number]>([58, 20]) // arranca mirando a Sudamérica
  const [girando, setGirando] = useState(true)
  const [tip, setTip] = useState<{ x: number; y: number; p: PuntoGlobo | { nombre: string } } | null>(null)
  const arrastre = useRef<{ x: number; y: number; rot: [number, number] } | null>(null)
  const caja = useRef<HTMLDivElement>(null)

  const porNum = useMemo(() => new Map(puntos.map((p) => [p.num, p])), [puntos])
  const max = Math.max(1, ...puntos.map((p) => p.n))

  // rotación automática lenta mientras nadie interactúa
  useEffect(() => {
    if (!girando) return
    let id = 0
    let previo = performance.now()
    const paso = (t: number) => {
      const dt = t - previo
      previo = t
      setRot(([l, f]) => [l + dt * 0.006, f])
      id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [girando])

  // al elegir un país (desde el ranking o el mapa) el globo gira hasta centrarlo
  useEffect(() => {
    const p = puntos.find((x) => x.clave === seleccionado)
    if (!p) return
    setGirando(false)
    const destino: [number, number] = [-p.lon, -p.lat * 0.6]
    let id = 0
    const inicio = performance.now()
    let origen: [number, number] | null = null
    const paso = (t: number) => {
      setRot((r) => {
        origen = origen ?? r
        const k = Math.min(1, (t - inicio) / 700)
        const e = 1 - Math.pow(1 - k, 3)
        let dl = ((destino[0] - origen[0] + 540) % 360) - 180
        return [origen[0] + dl * e, origen[1] + (destino[1] - origen[1]) * e]
      })
      if (t - inicio < 700) id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [seleccionado, puntos])

  const proy = geoOrthographic().scale(TAM / 2 - 8).translate([TAM / 2, TAM / 2]).rotate([rot[0], rot[1]]).clipAngle(90)
  const camino = geoPath(proy)
  const centro: [number, number] = [-rot[0], -rot[1]]

  const mover = (e: React.PointerEvent) => {
    const r = caja.current?.getBoundingClientRect()
    if (arrastre.current) {
      const a = arrastre.current
      setRot([a.rot[0] + (e.clientX - a.x) * 0.35, Math.max(-60, Math.min(60, a.rot[1] - (e.clientY - a.y) * 0.35))])
    }
    if (tip && r) setTip({ ...tip, x: e.clientX - r.left, y: e.clientY - r.top })
  }

  const mostrar = (e: React.PointerEvent, p: PuntoGlobo | { nombre: string }) => {
    const r = caja.current?.getBoundingClientRect()
    if (r) setTip({ x: e.clientX - r.left, y: e.clientY - r.top, p })
  }

  return (
    <div ref={caja} className="relative mx-auto aspect-square w-full max-w-[560px] select-none touch-none"
      onPointerDown={(e) => { setGirando(false); arrastre.current = { x: e.clientX, y: e.clientY, rot }; (e.target as Element).setPointerCapture?.(e.pointerId) }}
      onPointerMove={mover}
      onPointerUp={() => { arrastre.current = null }}
      onPointerLeave={() => { arrastre.current = null; setTip(null) }}>
      <svg viewBox={`0 0 ${TAM} ${TAM}`} className="h-full w-full cursor-grab active:cursor-grabbing" role="img"
        aria-label="Globo terráqueo con la cantidad de huéspedes por país de origen">
        <defs>
          <radialGradient id="oceano" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#dcdcdc" />
          </radialGradient>
          <radialGradient id="brillo" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={TAM / 2} cy={TAM / 2} r={TAM / 2 - 8} fill="url(#oceano)" stroke="#1c1c1c" strokeWidth="1.5" />
        <path d={camino(GRATICULA) ?? ''} fill="none" stroke="#1c1c1c" strokeOpacity="0.07" />
        {PAISES.features.map((f: Feature<Geometry, { name: string }>) => {
          const p = porNum.get(String(f.id))
          const d = camino(f)
          if (!d) return null
          const activo = p && p.clave === seleccionado
          return (
            <path key={String(f.id) + f.properties.name} d={d}
              fill={activo ? '#1c1c1c' : colorPara(p?.n ?? 0, max)} stroke="#fff" strokeWidth={0.5}
              className="transition-[fill] duration-200"
              onPointerEnter={(e) => mostrar(e, p ?? { nombre: f.properties.name })}
              onPointerLeave={() => setTip(null)}
              onClick={() => p && onSeleccionar(p.clave === seleccionado ? null : p.clave)} />
          )
        })}
        {/* burbujas: se ven también los países chicos que no tienen polígono a esta escala */}
        {puntos.filter((p) => geoDistance([p.lon, p.lat], centro) < Math.PI / 2 - 0.05).map((p) => {
          const xy = proy([p.lon, p.lat])
          if (!xy) return null
          const r = 3 + 22 * Math.sqrt(p.n / max)
          const activo = p.clave === seleccionado
          return (
            <circle key={p.clave} cx={xy[0]} cy={xy[1]} r={r}
              fill={activo ? '#1c1c1c' : '#b5121b'} fillOpacity={activo ? 0.9 : 0.55} stroke="#fff" strokeWidth={1}
              className="cursor-pointer"
              onPointerEnter={(e) => mostrar(e, p)} onPointerLeave={() => setTip(null)}
              onClick={() => onSeleccionar(activo ? null : p.clave)} />
          )
        })}
        <circle cx={TAM / 2} cy={TAM / 2} r={TAM / 2 - 8} fill="url(#brillo)" pointerEvents="none" />
      </svg>

      {tip && (
        <div className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg bg-marca px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: tip.x, top: tip.y }}>
          {'n' in tip.p ? (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className={`fi fi-${tip.p.iso2} rounded-[2px]`} /> {tip.p.nombre}
              </div>
              <div className="mt-1 tabular-nums">{entero(tip.p.n)} huéspedes · {pct(tip.p.share, 1)}</div>
              {tip.p.varAnual !== null && (
                <div className={tip.p.varAnual >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {tip.p.varAnual >= 0 ? '▲' : '▼'} {pct(Math.abs(tip.p.varAnual * 100), 1)} vs año anterior
                </div>
              )}
            </>
          ) : (
            <div>{tip.p.nombre} · sin huéspedes en el período</div>
          )}
        </div>
      )}

      <div className="absolute bottom-1 left-1 flex gap-1 text-[11px]">
        {[['América', -60, 10], ['Europa', 15, 45], ['Asia', 100, 30], ['Oceanía', 140, -25]].map(([n, lon, lat]) => (
          <button key={n as string} type="button"
            onClick={() => { setGirando(false); setRot([-(lon as number), -(lat as number) * 0.6]) }}
            className="rounded-full border border-neutral-300 bg-white/90 px-2 py-0.5 hover:bg-marca hover:text-white">
            {n}
          </button>
        ))}
        <button type="button" onClick={() => setGirando((g) => !g)}
          className="rounded-full border border-neutral-300 bg-white/90 px-2 py-0.5 hover:bg-marca hover:text-white">
          {girando ? 'Pausar' : 'Girar'}
        </button>
      </div>
    </div>
  )
}
