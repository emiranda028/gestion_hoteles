import { notFound } from 'next/navigation'
import BotonImprimir from '@/components/gestion/BotonImprimir'
import { accesoGestion } from '@/lib/acceso'
import { antiguedad, comprobante, diasVencida } from '@/lib/gestion/cobranzas/calculo'
import * as db from '@/lib/gestion/cobranzas/datos'

export const metadata = { title: 'Estado de cuenta · Cobranzas' }
const f = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')
const m = (v: number) => `${v < 0 ? '-' : ''}$ ${Math.abs(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Estado de cuenta imprimible (para enviar al cliente en PDF)
export default async function Page({ searchParams }: { searchParams: Promise<{ hotel?: string; cliente?: string }> }) {
  const { hoteles } = await accesoGestion('/cobranzas')
  const { hotel, cliente } = await searchParams
  const h = hoteles.find((x) => x.id === hotel)
  if (!h || !cliente) notFound()
  const b = db.base(h.id), c = db.clientes(h.id)[cliente]
  const fs = b.facturas.filter((x) => x.cliente === cliente).sort((x, y) => x.vence.localeCompare(y.vence))
  const a = antiguedad(fs, b.corte)
  return (
    <article className="mx-auto max-w-3xl space-y-5 bg-white p-8 shadow-sm print:p-0 print:shadow-none">
      <div className="no-imprimir flex justify-end"><BotonImprimir /></div>
      <header className="flex items-start justify-between border-b-4 border-acento pb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-acento">Estado de cuenta</div>
          <h1 className="mt-1 text-2xl font-bold">{c?.nombre ?? cliente}</h1>
          <p className="text-sm text-neutral-600">{c?.cuit ? `CUIT ${c.cuit} · ` : ''}Cliente {cliente}</p>
        </div>
        <div className="text-right text-sm">
          <div className="font-bold">{h.nombre}</div>
          <div className="text-neutral-600">Saldos al {f(b.corte)}</div>
        </div>
      </header>
      <table className="w-full text-sm">
        <thead className="border-b-2 border-marca text-left text-[11px] uppercase tracking-wide text-neutral-500">
          <tr><th className="py-2">Comprobante</th><th>Emisión</th><th>Vencimiento</th><th className="text-right">Días vencida</th><th className="text-right">Saldo</th></tr>
        </thead>
        <tbody>
          {fs.map((x) => (
            <tr key={x.id} className="border-b border-neutral-100">
              <td className="py-1.5 font-mono text-xs">{comprobante(x)}</td><td>{f(x.emision)}</td><td>{f(x.vence)}</td>
              <td className="text-right">{Math.max(0, diasVencida(x, b.corte)) || ''}</td><td className="text-right tabular-nums">{m(x.saldo)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-bold">
          <tr className="border-t-2 border-marca"><td className="py-2" colSpan={4}>Saldo total</td><td className="text-right tabular-nums">{m(a.total)}</td></tr>
          <tr><td className="text-acento" colSpan={4}>Vencido</td><td className="text-right tabular-nums text-acento">{m(a.vencido)}</td></tr>
        </tfoot>
      </table>
    </article>
  )
}
