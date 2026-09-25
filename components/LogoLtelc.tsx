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
