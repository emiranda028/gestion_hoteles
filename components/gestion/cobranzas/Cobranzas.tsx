'use client'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { aplicarImportacion, cambiarCorte, previsualizar, type Vista } from '@/app/cobranzas/acciones'
import { antiguedad, prevision } from '@/lib/gestion/cobranzas/calculo'
import type { Base, Cliente, Factura, Gestion, Listas } from '@/lib/gestion/cobranzas/modelo'
import { Boton, Encabezado, Modal, Pestanas, SelectorHotel, entrada, fechaCortaAR } from '../comunes'
import ClientesTabla from './Clientes'
import Ficha from './Ficha'
import ListasEditor from './Listas'
import PrevisionVista from './Prevision'
import ResumenCobranzas from './Resumen'
import { pesos } from './formato'

export type Datos = {
  hotel: { id: string; nombre: string }
  base: Base; clientes: Record<string, Cliente>; gestiones: Record<string, Gestion[]>; previstas: Record<string, string>; listas: Listas
  usuario: { nombre: string; rol: string }
}
export type FilaCliente = { codigo: string; cliente: Cliente; facturas: Factura[]; a: ReturnType<typeof antiguedad>; ultima?: Gestion }
type Pestana = 'resumen' | 'clientes' | 'prevision' | 'listas'

export default function Cobranzas(props: Datos & { hoteles: { id: string; nombre: string }[] }) {
  const { hotel, hoteles, base, clientes, gestiones, previstas, usuario } = props
  const router = useRouter()
  const [pestana, setPestana] = useState<Pestana>('resumen')
  const [ficha, setFicha] = useState<{ codigo: string; vista?: 'facturas' | 'gestiones' | 'datos' } | null>(null)
  const [importar, setImportar] = useState(false)
  const [, iniciar] = useTransition()

  // una fila por cliente con deuda, con su antigüedad y última gestión
  const filas: FilaCliente[] = useMemo(() => {
    const m = new Map<string, Factura[]>()
    for (const f of base.facturas) m.set(f.cliente, [...(m.get(f.cliente) ?? []), f])
    return [...m].map(([codigo, facturas]) => ({
      codigo, facturas, cliente: clientes[codigo] ?? { codigo, nombre: codigo },
      a: antiguedad(facturas, base.corte), ultima: gestiones[codigo]?.[0],
    })).sort((x, y) => y.a.total - x.a.total)
  }, [base, clientes, gestiones])
  const total = useMemo(() => antiguedad(base.facturas, base.corte), [base])
  const prev = useMemo(() => prevision(base.facturas, base.corte, previstas), [base, previstas])
  const vacio = base.facturas.length === 0
  const puedeListas = usuario.rol !== 'cliente'

  return (
    <div className="space-y-5">
      <Encabezado titulo="Cobranzas"
        bajada="Cuentas por cobrar del hotel: antigüedad de la deuda, gestión de cada cliente y previsión semanal de cobros, todo sobre una misma base compartida.">
        <SelectorHotel hoteles={hoteles} actual={hotel.id} base="/cobranzas" />
      </Encabezado>

      <div className="tarjeta flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <div className="text-sm text-neutral-600">
          {base.importado ? (
            <>Facturas al <strong>{fechaCortaAR(base.importado.fecha)}</strong> · {base.importado.facturas} comprobantes de {base.importado.clientes} clientes
              <span className="hidden text-neutral-400 md:inline"> · importado por {base.importado.por}</span></>
          ) : 'Todavía no se importaron facturas.'}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            Antigüedad al
            <input type="date" value={base.corte} disabled={vacio}
              onChange={(e) => e.target.value && iniciar(async () => { await cambiarCorte(hotel.id, e.target.value); router.refresh() })}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm" />
          </label>
          {!vacio && <a href={`/cobranzas/descargar?hotel=${hotel.id}&tipo=listado`} className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium hover:border-neutral-500">Excel</a>}
          <Boton tipo="principal" onClick={() => setImportar(true)}>Importar facturas</Boton>
        </div>
      </div>

      {vacio ? (
        <div className="tarjeta rounded-xl bg-white p-10 text-center shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <div className="text-4xl">📥</div>
          <h2 className="mt-2 text-lg font-bold">Importá el informe de saldos del sistema contable</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">El mismo Excel de siempre (hoja DETALLE). Antes de aplicar vas a ver qué clientes son nuevos, cuáles ya no deben y cuánto cambió cada uno.</p>
          <Boton tipo="principal" className="mt-4" onClick={() => setImportar(true)}>Importar facturas</Boton>
        </div>
      ) : (
        <>
          <Pestanas valor={pestana} onChange={setPestana} opciones={[
            { valor: 'resumen', texto: 'Resumen' },
            { valor: 'clientes', texto: 'Clientes', extra: <span className="text-xs text-neutral-400">{filas.length}</span> },
            { valor: 'prevision', texto: 'Previsión de cobros' },
            ...(puedeListas ? [{ valor: 'listas' as const, texto: 'Listas' }] : []),
          ]} />
          {pestana === 'resumen' && <ResumenCobranzas filas={filas} total={total} prev={prev} corte={base.corte} abrir={(codigo, vista) => setFicha({ codigo, vista })} />}
          {pestana === 'clientes' && <ClientesTabla filas={filas} total={total} listas={props.listas} corte={base.corte} abrir={(codigo) => setFicha({ codigo })} />}
          {pestana === 'prevision' && <PrevisionVista hotel={hotel.id} filas={filas} prev={prev} corte={base.corte} previstas={previstas} abrir={(codigo) => setFicha({ codigo, vista: 'facturas' })} />}
          {pestana === 'listas' && puedeListas && <ListasEditor hotel={hotel.id} listas={props.listas} />}
        </>
      )}

      {ficha && <Ficha {...props} codigo={ficha.codigo} vistaInicial={ficha.vista} onCerrar={() => setFicha(null)} />}
      {importar && <Importar hotel={hotel.id} onCerrar={() => setImportar(false)} />}
    </div>
  )
}

function Importar({ hotel, onCerrar }: { hotel: string; onCerrar: () => void }) {
  const router = useRouter()
  const archivo = useRef<HTMLInputElement>(null)
  const [vista, setVista] = useState<Vista | null>(null)
  const [corte, setCorte] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const [pendiente, iniciar] = useTransition()

  const leer = () => {
    const f = archivo.current?.files?.[0]
    if (!f) return
    const fd = new FormData()
    fd.set('hotel', hotel); fd.set('archivo', f)
    setError('')
    iniciar(async () => { try { setVista(await previsualizar(fd)) } catch (e) { setError((e as Error).message) } })
  }
  const aplicar = () => iniciar(async () => {
    try { await aplicarImportacion(hotel, corte); router.refresh(); onCerrar() } catch (e) { setError((e as Error).message) }
  })
  const dif = vista ? vista.totalNuevo - vista.totalAnterior : 0

  return (
    <Modal titulo="Importar facturas" onCerrar={onCerrar} ancho="max-w-2xl">
      {!vista ? (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">Elegí el Excel del informe de saldos (hoja <strong>DETALLE</strong>, con las columnas Código, Nombre, Fecha emisión, Fecha vcto, Prefijo, Letra, Número, Moneda, Saldo y CUIT).
            Se reemplazan los saldos; los datos de gestión de cada cliente se conservan.</p>
          <input ref={archivo} type="file" accept=".xlsx,.xlsm" onChange={leer} className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-marca file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
          {pendiente && <p className="text-sm text-neutral-500">Leyendo el archivo…</p>}
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Dato t="Facturas" v={vista.facturas.toLocaleString('es-AR')} />
            <Dato t="Clientes" v={String(vista.clientes)} />
            <Dato t="Deuda nueva" v={pesos(vista.totalNuevo)} />
            <Dato t="Diferencia" v={`${dif >= 0 ? '+' : ''}${pesos(dif)}`} color={dif > 0 ? '#b5121b' : '#15803d'} />
          </div>
          {vista.nuevos.length > 0 && <Lista titulo={`Clientes nuevos (${vista.nuevos.length})`} items={vista.nuevos.map((c) => `${c.nombre} · ${pesos(c.total)}`)} />}
          {vista.sinDeuda.length > 0 && <Lista titulo={`Ya no tienen deuda (${vista.sinDeuda.length})`} items={vista.sinDeuda.map((c) => `${c.nombre} · antes ${pesos(c.totalAnterior)}`)} />}
          {vista.cambios.length > 0 && <Lista titulo="Mayores cambios" items={vista.cambios.map((c) => `${c.nombre}: ${pesos(c.antes)} → ${pesos(c.ahora)}`)} />}
          <label className="flex flex-wrap items-center gap-2 text-sm">Fecha de corte (antigüedad al)
            <input type="date" value={corte} onChange={(e) => setCorte(e.target.value)} className={`${entrada} w-auto`} />
          </label>
        </div>
      )}
      {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-acento">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        {vista && <Boton onClick={() => setVista(null)}>Elegir otro archivo</Boton>}
        <Boton onClick={onCerrar}>Cancelar</Boton>
        {vista && <Boton tipo="principal" disabled={pendiente} onClick={aplicar}>{pendiente ? 'Aplicando…' : 'Aplicar importación'}</Boton>}
      </div>
    </Modal>
  )
}

function Dato({ t, v, color }: { t: string; v: string; color?: string }) {
  return <div className="rounded-lg bg-neutral-50 p-2"><div className="text-[11px] text-neutral-500">{t}</div><div className="font-bold tabular-nums" style={{ color }}>{v}</div></div>
}
function Lista({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <details className="rounded-lg border border-neutral-200 p-2" open={items.length <= 6}>
      <summary className="cursor-pointer font-semibold">{titulo}</summary>
      <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5 text-neutral-700">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </details>
  )
}
