import { MarcaLtelc } from '@/components/LogoLtelc'
import FormLogin from './FormLogin'

export const metadata = { title: 'Ingresar · Gestión Hotelera' }

export default async function Page({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver } = await searchParams
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="text-2xl font-bold tracking-tight">Gestión Hotelera</div>
          <div className="mt-3 flex items-baseline gap-2 text-2xl">
            <MarcaLtelc />
            <span className="font-marca text-base font-semibold text-neutral-400">BI</span>
          </div>
        </div>
        <FormLogin volver={volver ?? '/'} />
      </div>
    </div>
  )
}
