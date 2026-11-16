// Al arrancar el servidor se leen los datos una vez, y cada 2 minutos se revisa si la ingesta trajo
// algo nuevo: así el primer usuario después de un reinicio o de una actualización no espera la lectura.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { cargarDatos } = await import('./lib/datos')
  const calentar = () => {
    try {
      cargarDatos()
    } catch {
      // si falla, la pantalla lo vuelve a intentar al abrirse
    }
  }
  setTimeout(calentar, 500)
  setInterval(calentar, 120e3).unref()
}
