// Service worker mínimo: hace instalable la app. No guarda datos de los hoteles en el dispositivo.
const OFFLINE = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sin conexión</title><body style="font-family:Helvetica,Arial,sans-serif;background:#1c1c1c;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center">
<div><h1 style="font-size:20px">Sin conexión</h1><p style="color:#bbb">Revisá tu conexión a internet y volvé a intentar.</p>
<button onclick="location.reload()" style="margin-top:12px;border:0;border-radius:999px;padding:10px 20px;background:#b5121b;color:#fff;font-weight:600">Reintentar</button></div></body></html>`

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
})
