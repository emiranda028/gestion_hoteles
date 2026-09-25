import { FirmaLtelc, LogoLtelc } from '@/components/LogoLtelc'
import PortadaHoteles from '@/components/PortadaHoteles'
import { portada } from '@/lib/portada'
import FormLogin from './FormLogin'

export const metadata = { title: 'Ingresar · Gestión Hotelera' }

export default async function Page({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver } = await searchParams
  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      <div className="relative h-[38vh] min-h-56 lg:h-auto lg:min-h-dvh lg:flex-[1.35]">
        <PortadaHoteles hoteles={portada()} />
      </div>
      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-white px-6 pb-6 pt-8 sm:px-10 lg:mt-0 lg:rounded-none lg:px-14">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <LogoLtelc />
          <h1 className="mt-10 text-2xl font-bold tracking-tight">Gestión Hotelera</h1>
          <p className="mt-1 text-sm text-neutral-500">Ingresá con el usuario que te dio LTELC.</p>
          <div className="mt-6">
            <FormLogin volver={volver ?? '/'} />
          </div>
        </div>
        <div className="mx-auto mt-8 flex w-full max-w-sm justify-between text-xs text-neutral-500">
          <span>© {new Date().getFullYear()}</span>
          <FirmaLtelc />
        </div>
      </div>
    </div>
  )
}
