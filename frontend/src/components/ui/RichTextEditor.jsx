import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'

import { isRichTextEmpty, toEditorHtml } from '@/lib/richText'

/**
 * Editor de texto enriquecido para descripciones de obligaciones y contenido
 * de cláusulas.
 *
 * Expone la misma interfaz que un `<textarea>` controlado (`value`/`onChange`)
 * a propósito: reemplazarlo en un formulario existente no obliga a cambiar el
 * manejo del estado.
 *
 * Devuelve HTML, que el backend sanea antes de guardar
 * (`apps/common/sanitize.py`). Cuando el editor queda vacío devuelve `''` y no
 * `'<p></p>'`, para que las validaciones tipo `if (!campo.trim())` que ya
 * existen en los formularios sigan funcionando igual.
 */

const BOTONES = [
  { id: 'bold', etiqueta: 'Negrita', icono: 'format_bold' },
  { id: 'italic', etiqueta: 'Cursiva', icono: 'format_italic' },
  { id: 'underline', etiqueta: 'Subrayado', icono: 'format_underlined' },
  { id: 'bulletList', etiqueta: 'Lista con viñetas', icono: 'format_list_bulleted' },
  { id: 'orderedList', etiqueta: 'Lista numerada', icono: 'format_list_numbered' },
  { id: 'heading', etiqueta: 'Subtítulo', icono: 'title' },
]

const BotonBarra = ({ etiqueta, icono, activo, onClick, disabled }) => (
  <button
    type="button"
    aria-label={etiqueta}
    aria-pressed={activo}
    title={etiqueta}
    onMouseDown={(e) => e.preventDefault()} // conservar la selección del editor
    onClick={onClick}
    disabled={disabled}
    className={`p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      activo
        ? 'bg-primary/15 text-primary'
        : 'text-subtle-light dark:text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-700'
    }`}
  >
    <span className="material-icons text-base leading-none align-middle">{icono}</span>
  </button>
)

const RichTextEditor = ({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  minHeight = '8rem',
  className = '',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: toEditorHtml(value),
    editable: !disabled,
    onUpdate: ({ editor: instancia }) => {
      const html = instancia.getHTML()
      onChange(isRichTextEmpty(html) ? '' : html)
    },
    editorProps: {
      attributes: {
        class: 'rich-text focus:outline-none px-3 py-2',
        style: `min-height: ${minHeight}`,
      },
    },
  })

  // Sincroniza cuando el valor cambia desde afuera (reset del formulario, o
  // cargar otra obligación para editarla). Se compara contra el HTML actual
  // para no reescribir el documento en cada tecleo, que movería el cursor.
  useEffect(() => {
    if (!editor) return

    const entrante = toEditorHtml(value)
    const actual = editor.getHTML()

    if (entrante === actual) return
    if (isRichTextEmpty(entrante) && isRichTextEmpty(actual)) return

    editor.commands.setContent(entrante, false)
  }, [value, editor])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  if (!editor) return null

  const acciones = {
    bold: () => editor.chain().focus().toggleBold().run(),
    italic: () => editor.chain().focus().toggleItalic().run(),
    underline: () => editor.chain().focus().toggleUnderline().run(),
    bulletList: () => editor.chain().focus().toggleBulletList().run(),
    orderedList: () => editor.chain().focus().toggleOrderedList().run(),
    heading: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  }

  const estaActivo = (id) =>
    id === 'heading' ? editor.isActive('heading', { level: 3 }) : editor.isActive(id)

  const gestionarEnlace = () => {
    const actual = editor.getAttributes('link').href || ''
    const url = window.prompt('Dirección del enlace (vacío para quitarlo):', actual)

    if (url === null) return

    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  return (
    <div
      className={`border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 overflow-hidden ${className}`}
    >
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        {BOTONES.map(({ id, etiqueta, icono }) => (
          <BotonBarra
            key={id}
            etiqueta={etiqueta}
            icono={icono}
            activo={estaActivo(id)}
            onClick={acciones[id]}
            disabled={disabled}
          />
        ))}

        <BotonBarra
          etiqueta="Enlace"
          icono="link"
          activo={editor.isActive('link')}
          onClick={gestionarEnlace}
          disabled={disabled}
        />

        <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

        <BotonBarra
          etiqueta="Quitar formato"
          icono="format_clear"
          activo={false}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          disabled={disabled}
        />
      </div>

      <EditorContent
        editor={editor}
        className="text-sm text-gray-900 dark:text-white max-h-80 overflow-y-auto"
      />
    </div>
  )
}

export default RichTextEditor
