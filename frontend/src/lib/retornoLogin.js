/**
 * Destino al que volver después del login.
 *
 * Quien entra por un enlace directo sin sesión cae en el login con
 * `state.from`; al autenticarse se lo devuelve a esa pantalla. Sólo se aceptan
 * rutas internas de la aplicación (nada de URLs externas: open redirect).
 */

/**
 * Rutas que no tiene sentido pedir como destino: volver al login es un bucle.
 */
const RUTAS_EXCLUIDAS = ['/login', '/logout', '/forgot-password', '/reset-password']

/** Un destino más largo que esto no es una ruta legítima de la aplicación. */
const LARGO_MAXIMO = 512

/**
 * NUL, tabs, CR, LF y demás controles: inyección de encabezados y rarezas de
 * parseo. Se comprueba por código y no con una clase de caracteres para que el
 * archivo no lleve bytes de control literales.
 */
function tieneControles(texto) {
  for (let i = 0; i < texto.length; i += 1) {
    const codigo = texto.charCodeAt(i)
    if (codigo < 0x20 || codigo === 0x7f) return true
  }
  return false
}

/**
 * Normaliza un destino a una ruta interna segura para `navigate(destino)`, o
 * `null` si no sirve como destino (externa, bucle al login, basura).
 */
export function normalizarRetorno(destino) {
  if (typeof destino !== 'string') return null
  const bruto = destino.trim()
  if (!bruto.startsWith('/')) return null
  if (bruto.startsWith('//') || bruto.startsWith('/\\')) return null
  if (bruto.length > LARGO_MAXIMO) return null
  if (tieneControles(bruto)) return null

  // Base sintética: sólo sirve para parsear, nunca sale de esta función.
  let url
  try {
    url = new URL(bruto, 'https://app.invalid')
  } catch {
    return null
  }
  if (url.origin !== 'https://app.invalid') return null

  if (url.pathname === '/') return null // el home ya es el destino por defecto
  if (RUTAS_EXCLUIDAS.some((r) => url.pathname === r || url.pathname.startsWith(`${r}/`))) {
    return null
  }

  const query = url.searchParams.toString()
  return `${url.pathname}${query ? `?${query}` : ''}${url.hash}`
}

/** Lee el destino que el guard de rutas dejó en `location.state.from`. */
export function retornoDesdeState(state) {
  const from = state?.from
  if (!from?.pathname) return null
  return normalizarRetorno(`${from.pathname}${from.search ?? ''}${from.hash ?? ''}`)
}
