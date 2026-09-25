import { MonogramaLtelc } from '@/components/LogoLtelc'
import FormLogin from './FormLogin'

export const metadata = { title: 'Ingresar · Gestión Hotelera' }

export default async function Page({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver } = await searchParams
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <MonogramaLtelc size={56} />
          <div className="mt-4 text-2xl font-bold tracking-tight">Gestión Hotelera</div>
          <div className="font-marca mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">por LTELC BI</div>
        </div>
        <FormLogin volver={volver ?? '/'} />
      </div>
    </div>
  )
}
