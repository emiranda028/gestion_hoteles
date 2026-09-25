import { cargarDatos } from '@/lib/datos'
import { agrupar, sumarDias } from '@/lib/kpi'
import { fechaLarga } from '@/lib/formato'

export const metadata = { title: 'Datos e ingesta · Gestión Hotelera' }

export default function Page() {
  const d = cargarDatos()
  const hace30 = sumarDias(d.hasta, -29)
  const cobertura = [...agrupar(d.dias, (x) => x.h).entries()].map(([id, dias]) => {
    const fechas = new Set(dias.map((x) => x.f))
    const faltantes: string[] = []
    for (let f = hace30; f <= d.hasta; f = sumarDias(f, 1)) if (!fechas.has(f)) faltantes.push(f)
    return {
      id,
      nombre: d.hoteles.find((h) => h.id === id)?.nombre ?? id,
      desde: dias[0].f,
      hasta: dias[dias.length - 1].f,
      total: fechas.size,
      faltantes,
    }
  })
  const conAvisos = d.ingesta?.archivos.filter((a) => !a.ok || a.avisos.length) ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Datos e ingesta automática</h1>
        <p className="text-sm text-slate-500">
          Todos los días se leen los reportes de Opera (Manager Flash, History &amp; Forecast, Elite Arrivals) y las
          planillas de disponibilidades que llegan al correo, y se actualiza esta app.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="tarjeta rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Última ejecución</h2>
          {d.demo && (
            <p className="mb-2 text-sm text-amber-700">
              La app está mostrando datos de demostración: todavía no hay datos reales cargados.
            </p>
          )}
          {d.ingesta ? (
            <>
              <p className="text-sm">
                {new Date(d.ingesta.ejecutado).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} ·{' '}
                {d.ingesta.archivos.length} archivo(s), {d.ingesta.archivos.filter((a) => a.ok).length} correcto(s)
              </p>
              {conAvisos.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm">
                  {conAvisos.map((a, i) => (
                    <li key={i} className={`rounded-md p-2 ${a.ok ? 'bg-amber-50' : 'bg-red-50'}`}>
                      <div className="font-medium">{a.ok ? 'Con avisos' : 'Error'}: {a.tipo} · {a.origen}</div>
                      <ul className="ml-4 list-disc text-xs text-slate-600">
                        {a.avisos.map((t, j) => <li key={j}>{t}</li>)}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">La ingesta todavía no se ejecutó.</p>
          )}
        </section>

        <section className="tarjeta rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Descargas</h2>
          {d.demo ? (
            <p className="text-sm text-slate-500">Disponibles cuando haya datos reales.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              <li><a className="text-marca underline" href="/api/descargar/hoteles.xlsx">hoteles.xlsx</a> — Excel con el formato de la base de Power BI (H&amp;F, Flash, Pick up, Bonvoy, Disponibilidades)</li>
              <li><a className="text-marca underline" href="/api/descargar/hf.csv">hf.csv</a> — History &amp; Forecast por hotel y día</li>
              <li><a className="text-marca underline" href="/api/descargar/flash.csv">flash.csv</a> — Manager Flash</li>
              <li><a className="text-marca underline" href="/api/descargar/pickup.csv">pickup.csv</a> — fotos diarias del on the books</li>
              <li><a className="text-marca underline" href="/api/descargar/disponibilidades.csv">disponibilidades.csv</a> — saldos por grupo</li>
              <li><a className="text-marca underline" href="/api/descargar/tipo_cambio.csv">tipo_cambio.csv</a> — dólar BNA vendedor</li>
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Mientras convivan, los tableros de Power BI pueden leer el Excel consolidado en lugar del armado a mano.
          </p>
        </section>
      </div>

      <section className="tarjeta rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Cobertura por hotel (últimos 30 días)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-4">Hotel</th>
                <th className="py-2 pr-4">Desde</th>
                <th className="py-2 pr-4">Último día</th>
                <th className="py-2 pr-4 text-right">Días cargados</th>
                <th className="py-2">Días faltantes</th>
              </tr>
            </thead>
            <tbody>
              {cobertura.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 align-top">
                  <td className="py-2 pr-4 font-medium">{c.nombre}</td>
                  <td className="py-2 pr-4">{fechaLarga(c.desde)}</td>
                  <td className={`py-2 pr-4 ${c.hasta < d.hasta ? 'text-red-600' : ''}`}>{fechaLarga(c.hasta)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{c.total}</td>
                  <td className="py-2 text-xs text-slate-600">
                    {c.faltantes.length ? c.faltantes.map((f) => fechaLarga(f).slice(0, 5)).join(', ') : 'Ninguno'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
