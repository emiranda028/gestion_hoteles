import { cargarDatos } from '@/lib/datos'
import { TRAMOS, antiguedad, comprobante, diasVencida, tramo } from '@/lib/gestion/cobranzas/calculo'
import * as db from '@/lib/gestion/cobranzas/datos'
import { planilla } from '@/lib/gestion/cobranzas/excel'
import { seccionesPermitidas, usuarioActual, veHotel } from '@/lib/usuarios'

const fecha = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')
const MONEDA = '#,##0.00;[Red]-#,##0.00'

// Excel del listado de clientes con antigüedad, o del estado de cuenta de un cliente
export async function GET(req: Request) {
  const url = new URL(req.url)
  const hotel = url.searchParams.get('hotel') ?? '', tipo = url.searchParams.get('tipo'), codigo = url.searchParams.get('cliente') ?? ''
  const u = await usuarioActual()
  const h = cargarDatos().hoteles.find((x) => x.id === hotel)
  if (!u || !h || !veHotel(u, h) || !seccionesPermitidas(u).includes('/cobranzas')) return new Response('Prohibido', { status: 403 })
  const b = db.base(hotel), cl = db.clientes(hotel)
  let buffer: Buffer, nombre: string
  if (tipo === 'estado') {
    const c = cl[codigo]
    const fs = b.facturas.filter((f) => f.cliente === codigo).sort((x, y) => x.vence.localeCompare(y.vence))
    const a = antiguedad(fs, b.corte)
    buffer = await planilla([{
      nombre: 'Estado de cuenta',
      titulo: [`Estado de cuenta · ${c?.nombre ?? codigo}`, `${h.nombre} · al ${fecha(b.corte)}${c?.cuit ? ` · CUIT ${c.cuit}` : ''}`, `Saldo total: ${a.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })} · Vencido: ${a.vencido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
      columnas: [{ t: 'Comprobante', ancho: 20 }, { t: 'Emisión', ancho: 12 }, { t: 'Vencimiento', ancho: 12 }, { t: 'Días vencida', ancho: 12 }, { t: 'Moneda', ancho: 8 }, { t: 'Saldo', ancho: 16, formato: MONEDA }],
      filas: fs.map((f) => [comprobante(f), fecha(f.emision), fecha(f.vence), Math.max(0, diasVencida(f, b.corte)), f.moneda, f.saldo]),
    }])
    nombre = `Estado de cuenta ${c?.nombre ?? codigo} ${b.corte}.xlsx`
  } else {
    const porCliente = new Map<string, typeof b.facturas>()
    for (const f of b.facturas) porCliente.set(f.cliente, [...(porCliente.get(f.cliente) ?? []), f])
    const filas = [...porCliente].map(([cod, fs]) => {
      const a = antiguedad(fs, b.corte), c = cl[cod]
      return [cod, c?.nombre ?? cod, c?.grupo ? 'Grupo' : 'Terceros', c?.condicion ?? '', c?.respCobranza ?? '', c?.estado ?? '', ...TRAMOS.map((t) => a[t.k]), a.total]
    }).sort((x, y) => Number(y[y.length - 1]) - Number(x[x.length - 1]))
    buffer = await planilla([
      {
        nombre: 'Antigüedad', titulo: [`Antigüedad de saldos · ${h.nombre} · al ${fecha(b.corte)}`],
        columnas: [{ t: 'Código', ancho: 9 }, { t: 'Cliente', ancho: 40 }, { t: 'Tipo', ancho: 10 }, { t: 'Condición', ancho: 18 }, { t: 'Resp. cobranza', ancho: 18 }, { t: 'Estado', ancho: 22 },
          ...TRAMOS.map((t) => ({ t: t.t, ancho: 15, formato: MONEDA })), { t: 'Total', ancho: 16, formato: MONEDA }],
        filas,
      },
      {
        nombre: 'Facturas', columnas: [{ t: 'Código', ancho: 9 }, { t: 'Cliente', ancho: 40 }, { t: 'Comprobante', ancho: 20 }, { t: 'Emisión', ancho: 12 }, { t: 'Vencimiento', ancho: 12 },
          { t: 'Días vencida', ancho: 12 }, { t: 'Tramo', ancho: 16 }, { t: 'Saldo', ancho: 16, formato: MONEDA }],
        filas: b.facturas.map((f) => [f.cliente, cl[f.cliente]?.nombre ?? f.cliente, comprobante(f), fecha(f.emision), fecha(f.vence), Math.max(0, diasVencida(f, b.corte)),
          TRAMOS.find((t) => t.k === tramo(f, b.corte))!.t, f.saldo]),
      },
    ])
    nombre = `Cobranzas ${h.nombre} ${b.corte}.xlsx`
  }
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
