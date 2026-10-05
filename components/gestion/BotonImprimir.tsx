'use client'

export default function BotonImprimir({ texto = 'Imprimir / PDF' }: { texto?: string }) {
  return (
    <button onClick={() => window.print()} className="rounded-full bg-marca px-4 py-1.5 text-sm font-semibold text-white hover:bg-black">
      {texto}
    </button>
  )
}
