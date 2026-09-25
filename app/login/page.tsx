import FormLogin from './FormLogin'

export const metadata = { title: 'Ingresar · Gestión Hotelera' }

export default async function Page({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver } = await searchParams
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold tracking-tight">Gestión Hotelera</div>
          <div className="mt-1 text-xs uppercase tracking-[0.25em] text-acento">LTELC BI</div>
        </div>
        <FormLogin volver={volver ?? '/'} />
      </div>
    </div>
  )
}
