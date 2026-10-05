// Módulo Cobranzas: facturas (del sistema contable), maestro de clientes, gestiones y fechas previstas de cobro.
// Las facturas se reemplazan en cada importación; todo lo de gestión se guarda aparte y se conserva por código de cliente.

export type Factura = {
  id: string // cliente|prefijo|letra|numero|cuota
  cliente: string // código del cliente en el sistema contable
  emision: string
  vence: string
  prefijo: string; letra: string; numero: string; cuota: string
  moneda: string
  saldo: number
}
export type Base = {
  corte: string // fecha de referencia para la antigüedad
  importado?: { archivo: string; fecha: string; por: string; facturas: number; clientes: number }
  facturas: Factura[]
}
export type Adjunto = { id: string; nombre: string; tipo: string; tamano: number; fecha: string; por: string }
export type Cliente = {
  codigo: string; nombre: string; cuit?: string
  grupo?: boolean // pertenece al grupo (management, intercompany): se informa aparte de los terceros
  condicion?: string; respVentas?: string; respCobranza?: string; deudaPor?: string; estado?: string
  contacto?: string; email?: string; telefono?: string
  eventoNombre?: string; eventoFecha?: string; blockCode?: string; pm?: string; invoice?: string
  adjuntos?: Adjunto[]
  actualizado?: string; actualizadoPor?: string
}
export type TipoGestion = 'llamada' | 'mail' | 'reclamo' | 'promesa' | 'acuerdo' | 'nota'
export type Gestion = { id: string; fecha: string; por: string; tipo: TipoGestion; texto: string; promesaFecha?: string; promesaMonto?: number }
export type Listas = { condicion: string[]; respVentas: string[]; respCobranza: string[]; deudaPor: string[]; estado: string[]; plantillas: string[] }

export const TIPOS_GESTION: { valor: TipoGestion; texto: string; icono: string }[] = [
  { valor: 'llamada', texto: 'Llamada', icono: '📞' },
  { valor: 'mail', texto: 'Mail', icono: '✉️' },
  { valor: 'reclamo', texto: 'Reclamo formal', icono: '📣' },
  { valor: 'promesa', texto: 'Promesa de pago', icono: '🤝' },
  { valor: 'acuerdo', texto: 'Acuerdo / plan', icono: '📝' },
  { valor: 'nota', texto: 'Nota interna', icono: '🗒️' },
]

export const LISTAS_INICIALES: Listas = {
  condicion: ['Cuentas corrientes', 'Grupos / Eventos', 'Reservas', 'Grupo (management / intercompany)'],
  respVentas: [],
  respCobranza: [],
  deudaPor: ['Alojamiento', 'Gastronomía', 'Eventos', 'Anticipos', 'Extras / Adicionales', 'Cochera mensual', 'Penalidad / No show', 'Canje / Compensación', 'Management', 'Intercompany', 'Saldo a favor'],
  estado: ['En término', 'En gestión', 'Factura enviada', 'Promesa de pago', 'En análisis / conciliación', 'Refacturación', 'Pasado a Comercial', 'Retenciones a regularizar', 'Canje', 'Cobrado / recibo a registrar', 'Legales'],
  plantillas: [
    'Saldo validado, compromiso de pago para el DD/MM/AAAA',
    'Saldo validado, informado y reclamado',
    'Saldo en análisis, en proceso de conciliación',
    'Saldo validado, se envía factura el DD/MM/AAAA',
    'Saldo validado, retenciones pendientes a regularizar para el DD/MM/AAAA',
    'Saldo validado, pagaron de menos por un error de ellos',
    'Sin respuesta concreta de cobro, se pasa a Comercial',
    'Vencimiento validado DD/MM/AAAA por contrato',
    'Canje con vigencia al DD/MM/AAAA, se comunica a Comercial',
  ],
}
