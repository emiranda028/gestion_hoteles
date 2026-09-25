'use client'
import { useEffect, useState } from 'react'
import EscenaHotel from './EscenaHotel'
import LogoHotel from './LogoHotel'

type Hotel = { id: string; nombre: string; lugar: string; foto: string | null }

/** Carrusel de la portada: foto del hotel (o ilustración del destino) que cambia cada 6 segundos. */
export default function PortadaHoteles({ hoteles }: { hoteles: Hotel[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (hoteles.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((x) => (x + 1) % hoteles.length), 6000)
    return () => clearInterval(t)
  }, [hoteles.length])

  return (
    <div className="relative h-full w-full overflow-hidden bg-marca">
      {hoteles.map((h, n) => (
        <div key={h.id} aria-hidden={n !== i}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ${n === i ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`h-full w-full ${n === i ? 'portada-zoom' : ''}`}>
            {h.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/portada/${h.id}?v=${h.foto}`} alt={h.nombre} className="h-full w-full object-cover"
                loading={n === 0 ? 'eager' : 'lazy'} />
            ) : (
              <EscenaHotel id={h.id} />
            )}
          </div>
        </div>
      ))}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
      <div className="absolute inset-x-0 bottom-0 px-6 pb-12 pt-6 text-white sm:p-10 lg:pb-10">
        {hoteles[i] && (
          <div key={hoteles[i].id} className="mb-4 flex h-16 items-end sm:h-20">
            <LogoHotel id={hoteles[i].id} nombre={hoteles[i].nombre} alto="h-14 sm:h-20" blanco />
          </div>
        )}
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">{hoteles[i]?.lugar}</div>
        <div className="sr-only">{hoteles[i]?.nombre}</div>
        <div className="mt-4 flex gap-2">
          {hoteles.map((h, n) => (
            <button key={h.id} onClick={() => setI(n)} aria-label={`Ver ${h.nombre}`}
              className={`h-1.5 rounded-full transition-all ${n === i ? 'w-8 bg-acento' : 'w-4 bg-white/50 hover:bg-white/80'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
