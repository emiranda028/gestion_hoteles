import LogoHotel, { LogoCityExpress } from './LogoHotel'
import { IconoLtelc } from './LogoLtelc'

// Se ve mientras el servidor prepara una pantalla (el ingreso, el cambio de solapa): los logos de los
// hoteles se van encendiendo de a uno para que se note que la app está trabajando.
const HOTELES = [
  { id: 'marriott', nombre: 'Marriott Buenos Aires' },
  { id: 'sheraton-bcr', nombre: 'Sheraton Bariloche' },
  { id: 'sheraton-mdq', nombre: 'Sheraton Mar del Plata' },
  { id: 'city-express', nombre: 'City Express Palermo' },
]

export default function PantallaCarga({ texto = 'Preparando la información de los hoteles…' }: { texto?: string }) {
  return (
    <div role="status" aria-live="polite" className="carga flex min-h-[65vh] flex-col items-center justify-center gap-8 px-2 py-10">
      <IconoLtelc className="carga-isotipo h-14 w-14 text-white drop-shadow-sm" />
      <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        {HOTELES.map((h, i) => (
          <div key={h.id} style={{ '--i': i } as React.CSSProperties}
            className="carga-logo tarjeta flex h-24 items-center justify-center rounded-xl bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            {h.id === 'city-express'
              ? <LogoCityExpress className="text-[9px] sm:text-[10px]" />
              : <LogoHotel id={h.id} nombre={h.nombre} alto="h-12" className="max-w-full" />}
          </div>
        ))}
      </div>
      <div className="w-full max-w-xs">
        <div className="h-1 overflow-hidden rounded-full bg-neutral-200">
          <div className="carga-barra h-1 w-2/5 rounded-full bg-acento" />
        </div>
        <p className="mt-3 text-center text-sm text-neutral-500">{texto}</p>
      </div>
    </div>
  )
}
