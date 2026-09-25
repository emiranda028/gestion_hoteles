'use client'
import { useEffect, useState } from 'react'

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Registra el service worker y ofrece "Instalar app" cuando el navegador lo permite. */
export function useInstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null)
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    const guardar = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar) }
    const instalada = () => setEvento(null)
    window.addEventListener('beforeinstallprompt', guardar)
    window.addEventListener('appinstalled', instalada)
    return () => {
      window.removeEventListener('beforeinstallprompt', guardar)
      window.removeEventListener('appinstalled', instalada)
    }
  }, [])
  if (!evento) return null
  return async () => {
    await evento.prompt()
    await evento.userChoice
    setEvento(null)
  }
}

export function IconoInstalar({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
    </svg>
  )
}
