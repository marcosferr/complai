import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the appropriate term for clauses based on document type
 * @param {string} documentType - The type of the document
 * @returns {string} "artículo" for LEYES_REGULACIONES, "cláusula" otherwise
 */
export function getClauseTerm(documentType) {
  return documentType === 'LEYES_REGULACIONES' ? 'artículo' : 'cláusula'
}

// Caracteres que Windows/macOS no aceptan en un nombre de archivo, más los de control.
const CARACTERES_INVALIDOS = /[\/:*?"<>|\x00-\x1f]/g
const LARGO_MAXIMO_BASE = 120

/**
 * Extrae la extensión real de un archivo almacenado.
 * Trabaja sobre el último segmento de la ruta para no confundir un punto
 * de la carpeta (p.ej. /media/v1.2/archivo) con una extensión.
 */
function extraerExtension(nombreAlmacenado) {
  if (!nombreAlmacenado) return ''
  const base = String(nombreAlmacenado).split(/[\/]/).pop().split('?')[0]
  const punto = base.lastIndexOf('.')
  if (punto <= 0) return ''
  const ext = base.slice(punto + 1)
  return /^[a-zA-Z0-9]{1,8}$/.test(ext) ? ext.toLowerCase() : ''
}

/**
 * Arma el nombre con el que se le entrega al usuario el archivo original.
 *
 * Al subir un documento, `document_upload_path` lo renombra a `<uuid>.<ext>`,
 * así que el nombre almacenado no le dice nada a quien lo descarga. Reconstruimos
 * el nombre a partir del título del documento y conservamos la extensión real.
 *
 * @param {string} titulo - Título del documento
 * @param {string} nombreAlmacenado - Ruta o nombre del archivo en el servidor
 * @param {string} [respaldo='documento'] - Nombre a usar si el título está vacío
 * @returns {string} Nombre de archivo seguro para el sistema operativo
 */
export function buildDownloadFilename(titulo, nombreAlmacenado, respaldo = 'documento') {
  const base = String(titulo ?? '')
    .replace(CARACTERES_INVALIDOS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '')
    .slice(0, LARGO_MAXIMO_BASE)
    .trim()

  const nombre = base || respaldo
  const extension = extraerExtension(nombreAlmacenado)

  return extension ? `${nombre}.${extension}` : nombre
}
