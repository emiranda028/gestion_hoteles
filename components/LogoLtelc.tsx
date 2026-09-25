// Marca LTELC en texto: "Lo tengo en la cabeza" se cierra en sus iniciales.
const PALABRAS: [string, string][] = [['L', 'o'], ['T', 'engo'], ['E', 'n'], ['L', 'a'], ['C', 'abeza']]

/**
 * animado: al cargar muestra la frase y a los ~2 s se junta en LTELC.
 * al pasar el mouse: se muestra LTELC y la frase se abre al pasar el mouse (para el pie).
 */
export function MarcaLtelc({ modo = 'animado', className = '' }: { modo?: 'animado' | 'hover'; className?: string }) {
  return (
    <span className={`ltelc ltelc-${modo} ${className}`} aria-label="LTELC, lo tengo en la cabeza" role="img">
      {PALABRAS.map(([ini, resto], i) => (
        <span key={i} className="p" style={{ ['--i' as string]: i }}>
          <span className="ini">{ini}</span>
          <span className="r">{resto}</span>
        </span>
      ))}
    </span>
  )
}

/** Isotipo: la cabeza (círculo) con la idea adentro (la L y el punto rojo). */
export function IconoLtelc({ className = 'h-8 w-8', fondo = true }: { className?: string; fondo?: boolean }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="LTELC">
      {fondo && <rect width="512" height="512" rx="116" fill="#1c1c1c" />}
      <circle cx="256" cy="256" r="160" fill="none" stroke="currentColor" strokeWidth="36" />
      <path d="M204 178 V322 H310" fill="none" stroke="currentColor" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="ltelc-idea" cx="312" cy="196" r="29" fill="#e11d2a" />
    </svg>
  )
}

/** Logo completo: isotipo + LTELC (animado: la frase se junta en las iniciales) + BI. */
export function LogoLtelc({ animado = true, claro = false }: { animado?: boolean; claro?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${animado ? 'ltelc-logo-animado' : ''} ${claro ? 'text-white' : 'text-neutral-900'}`}>
      <IconoLtelc className="h-12 w-12 shrink-0 text-white" />
      <div className="leading-none">
        <div className="flex items-baseline gap-1.5 text-2xl">
          <MarcaLtelc modo={animado ? 'animado' : 'hover'} className={claro ? 'text-white' : ''} />
          <span className={`font-marca text-sm font-semibold ${claro ? 'text-neutral-400' : 'text-acento'}`}>BI</span>
        </div>
        <div className={`mt-1 text-[11px] uppercase tracking-[0.2em] ${claro ? 'text-neutral-400' : 'text-neutral-500'}`}>
          lo tengo en la cabeza
        </div>
      </div>
    </div>
  )
}

/** "Hecho por LTELC BI" para el pie de cada página. */
export function FirmaLtelc() {
  return (
    <a href="https://www.lotengoenlacabeza.com.ar" target="_blank" rel="noopener noreferrer"
      className="inline-flex items-baseline gap-1.5 text-neutral-500 hover:text-neutral-900">
      Hecho por
      <MarcaLtelc modo="hover" className="text-[13px] text-neutral-900" />
      <span className="font-marca text-[13px] font-semibold text-neutral-500">BI</span>
    </a>
  )
}
