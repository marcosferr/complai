import DOMPurify from 'dompurify'

import { isHtml, isRichTextEmpty } from '@/lib/richText'

/**
 * Espejo de la lista blanca del backend (apps/common/sanitize.py).
 * Si allá se permite una etiqueta nueva, hay que agregarla acá también.
 */
const ALLOWED_TAGS = [
  'p', 'br',
  'strong', 'b', 'em', 'i', 'u', 's',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4',
  'blockquote', 'code', 'pre',
  'a',
]

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel']

/**
 * Muestra contenido que puede venir en dos formatos:
 *
 *  - HTML del editor enriquecido (obligaciones y cláusulas nuevas)
 *  - texto plano heredado (todo lo cargado antes del cambio, más lo que
 *    extrae la IA de los documentos)
 *
 * El texto plano se muestra con `whitespace-pre-wrap` para no perder los
 * saltos de línea; el HTML se sanea con DOMPurify antes de inyectarse.
 *
 * El saneado del backend es el control principal: éste es la segunda barrera,
 * por si algún dato entró a la base por fuera de los serializers.
 */
const RichTextContent = ({ value, className = '', emptyText = null }) => {
  if (isRichTextEmpty(value)) {
    if (!emptyText) return null

    return <span className={`italic text-subtle-light dark:text-subtle-dark ${className}`}>{emptyText}</span>
  }

  if (!isHtml(value)) {
    return <div className={`whitespace-pre-wrap ${className}`}>{value}</div>
  }

  const html = DOMPurify.sanitize(value, { ALLOWED_TAGS, ALLOWED_ATTR })

  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default RichTextContent
