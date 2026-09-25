// Logos de los hoteles. City Express Plus todavía no tiene logo: se arma con el estilo del cartel de ingreso
// (marquesina negra, mayúsculas geométricas espaciadas y "BY MARRIOTT" debajo, alineado a la derecha).

const IMAGENES: Record<string, { src: string; nombre: string; ancho: number; alto: number }> = {
  marriott: { src: '/logos/marriott.png', nombre: 'Marriott Buenos Aires', ancho: 263, alto: 231 },
  'sheraton-mdq': { src: '/logos/sheraton-mdq.png', nombre: 'Sheraton Mar del Plata Hotel', ancho: 784, alto: 456 },
  'sheraton-bcr': { src: '/logos/sheraton-bcr.png', nombre: 'Sheraton Bariloche', ancho: 371, alto: 214 },
}

export function LogoCityExpress({ className = '', blanco = false }: { className?: string; blanco?: boolean }) {
  return (
    <span role="img" aria-label="City Express Plus by Marriott"
      className={`inline-flex flex-col items-end rounded-md px-[0.9em] py-[0.55em] leading-none ${
        blanco ? 'bg-white/10 text-white ring-1 ring-white/30 backdrop-blur-sm' : 'bg-[#141414] text-white'} ${className}`}
      style={{ fontFamily: 'Montserrat, "Helvetica Neue", Arial, sans-serif' }}>
      <span className="whitespace-nowrap font-medium tracking-[0.2em]">
        CITY EXPRESS <span className="font-bold">PLUS</span>
      </span>
      <span className="mt-[0.45em] whitespace-nowrap text-[0.62em] font-bold tracking-[0.28em]">BY MARRIOTT</span>
    </span>
  )
}

/** Logo del hotel; si no hay, el nombre en texto. alto: clase de altura de Tailwind (p. ej. h-14). */
export default function LogoHotel({ id, nombre, alto = 'h-14', blanco = false, className = '' }: {
  id: string; nombre: string; alto?: string; blanco?: boolean; className?: string
}) {
  if (id === 'city-express') {
    return <LogoCityExpress blanco={blanco} className={`text-[13px] ${className}`} />
  }
  const img = IMAGENES[id]
  if (!img) return <span className={`font-bold uppercase tracking-wide ${className}`}>{nombre}</span>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img.src} alt={img.nombre} width={img.ancho} height={img.alto}
      className={`${alto} w-auto object-contain ${id === 'marriott' ? 'scale-125' : ''} ${blanco ? 'brightness-0 invert' : ''} ${className}`} />
  )
}
