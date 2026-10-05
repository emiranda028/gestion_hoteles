'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { guardarListas } from '@/app/cobranzas/acciones'
import type { Listas } from '@/lib/gestion/cobranzas/modelo'
import { Boton, entrada } from '../comunes'

const NOMBRES: Record<keyof Listas, string> = {
  respCobranza: 'Responsables de cobranza', respVentas: 'Responsables comerciales', estado: 'Estados de gestión',
  condicion: 'Condiciones', deudaPor: 'Deuda por (concepto)', plantillas: 'Textos modelo para gestiones',
}

export default function ListasEditor({ hotel, listas }: { hotel: string; listas: Listas }) {
  const router = useRouter()
  const [x, setX] = useState(() => Object.fromEntries(Object.entries(listas).map(([k, v]) => [k, (v as string[]).join('\n')])) as Record<keyof Listas, string>)
  const [ok, setOk] = useState('')
  const [pendiente, iniciar] = useTransition()
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">Una opción por renglón. Son las opciones de los desplegables de la ficha de cada cliente.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(NOMBRES) as (keyof Listas)[]).map((k) => (
          <label key={k} className={`tarjeta rounded-xl bg-white p-4 text-sm font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.08)] ${k === 'plantillas' ? 'md:col-span-2 lg:col-span-3' : ''}`}>
            {NOMBRES[k]}
            <textarea value={x[k]} onChange={(e) => setX({ ...x, [k]: e.target.value })} rows={k === 'plantillas' ? 6 : 8} className={`${entrada} mt-2 font-normal`} />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-end gap-3">
        {ok && <span className="text-sm text-emerald-700">{ok}</span>}
        <Boton tipo="principal" disabled={pendiente} onClick={() => iniciar(async () => {
          await guardarListas(hotel, Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v.split('\n')])) as unknown as Listas)
          router.refresh(); setOk('Listas guardadas')
        })}>Guardar listas</Boton>
      </div>
    </div>
  )
}
