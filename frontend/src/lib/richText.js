/**
 * Utilidades para convivir con los dos formatos que hay en la base:
 * el HTML nuevo que produce el editor y el texto plano ya cargado.
 *
 * Son funciones puras y sin DOM a proposito: se pueden testear en Node y se
 * pueden usar tanto al renderizar como al filtrar listas.
 */

// Exige una letra despues del '<' para no confundir "plazo < 30 dias" con markup.
const TAG = /<\/?[a-z][^>]*>/i
const ANY_TAG = /<\/?[a-z][^>]*>/gi

// Cierre de bloque o salto: sin esto "<li>a</li><li>b</li>" quedaria como "ab".
const BLOCK_BOUNDARY = /<br\s*\/?>|<\/(p|li|ul|ol|h[1-6]|blockquote|div|tr)>/gi

/**
 * Decodifica las entidades mas comunes.
 * `&amp;` va al final para no volver a decodificar lo ya decodificado:
 * "&amp;lt;" tiene que quedar en "&lt;", no en "<".
 */
const decodeEntities = (text) =>
  text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/gi, '&')

/** ¿El valor viene del editor enriquecido (y no es texto plano viejo)? */
export const isHtml = (value) => Boolean(value) && TAG.test(value)

/**
 * Texto legible sin etiquetas. Para buscar, truncar y previsualizar,
 * NO para mostrar contenido completo (para eso esta RichTextContent).
 */
export const htmlToPlainText = (value) => {
  if (!value) return ''

  return decodeEntities(String(value).replace(BLOCK_BOUNDARY, ' ').replace(ANY_TAG, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

/** Trunca sobre el texto visible, nunca a la mitad de una etiqueta. */
export const truncateRich = (value, maxLength) => {
  const texto = htmlToPlainText(value)

  return texto.length > maxLength ? `${texto.slice(0, maxLength)}...` : texto
}

/**
 * ¿No hay texto visible? Un editor vacio no manda '' sino `<p></p>` o `<p><br></p>`,
 * que en un `if (valor)` daria verdadero.
 */
export const isRichTextEmpty = (value) => htmlToPlainText(value) === ''

// El '&' va primero: si no, escaparia de nuevo los '&' que acaba de escribir.
const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Prepara un valor para cargarlo en el editor.
 *
 * El HTML pasa tal cual; el texto plano heredado se parte en parrafos, porque
 * si se cargara como una sola linea se perderian los saltos que tenia el
 * registro original al guardarlo de nuevo.
 */
export const toEditorHtml = (value) => {
  if (!value) return ''
  if (isHtml(value)) return value

  return String(value)
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => `<p>${escapeHtml(linea)}</p>`)
    .join('')
}
