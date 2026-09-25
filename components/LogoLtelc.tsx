// Marca LTELC ("lo tengo en la cabeza"): perfil de un solo trazo con la chispa de la idea.

export function IsotipoLtelc({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label="LTELC">
      <path d="M32 90 V74 C23 68 18 57 18 45 C18 26 33 11 52 11 C70 11 84 24 84 41 C84 46 83 49 85 53 L90 61.5 C91.2 63.6 89.8 66 87.4 66 H84 V73 C84 77.4 80.4 81 76 81 H66 V90"
        fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 25 L55.2 36.8 L67 40 L55.2 43.2 L52 55 L48.8 43.2 L37 40 L48.8 36.8 Z" fill="#2EE6D6" />
    </svg>
  )
}

export function MonogramaLtelc({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="LTELC">
      <rect width="100" height="100" rx="24" fill="#0B1630" />
      <path d="M32 24 V74 H70" fill="none" stroke="#fff" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M60 22 L63.6 35.4 L77 39 L63.6 42.6 L60 56 L56.4 42.6 L43 39 L56.4 35.4 Z" fill="#2EE6D6" />
    </svg>
  )
}

/** "Hecho por LTELC BI" para el pie de cada página. */
export function FirmaLtelc() {
  return (
    <a href="https://www.lotengoenlacabeza.com.ar" target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900" title="Lo tengo en la cabeza">
      Hecho por
      <IsotipoLtelc size={20} className="text-neutral-900" />
      <span className="font-marca text-[13px] font-extrabold tracking-wide text-neutral-900">LTELC <span className="font-semibold text-neutral-500">BI</span></span>
    </a>
  )
}
