"""Saneado del HTML que producen los editores de texto enriquecido.

Este módulo es la frontera de seguridad: lo que devuelve `sanitize_rich_text` es
exactamente lo que se guarda en la base. El frontend vuelve a sanear al renderizar,
pero esa segunda pasada es defensa en profundidad, no el control principal.

La lista blanca vive acá y en ningún otro lado. Si hace falta permitir una etiqueta
nueva, se agrega en `ALLOWED_TAGS` y se ajusta el editor para que la pueda generar.
"""

import html as html_module
import re

import bleach
from bleach import html5lib_shim

# Etiquetas que el editor Tiptap puede generar con la configuración actual
# (negrita, cursiva, subrayado, listas, encabezados, enlaces, citas y código).
ALLOWED_TAGS = frozenset({
    'p', 'br',
    'strong', 'b', 'em', 'i', 'u', 's',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4',
    'blockquote', 'code', 'pre',
    'a',
})

ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target', 'rel'],
}

# Sin 'javascript', 'data' ni 'vbscript': son los vectores clásicos vía href.
ALLOWED_PROTOCOLS = frozenset({'http', 'https', 'mailto'})

# bleach con strip=True descarta la etiqueta pero conserva su texto, así que
# `<script>alert(1)</script>` dejaría "alert(1)" suelto en la cláusula. Inofensivo,
# pero feo. Los sacamos con su contenido antes de sanear; bleach sigue siendo el
# control de seguridad real, esto es sólo prolijidad.
_SCRIPT_OR_STYLE = re.compile(
    r'<\s*(script|style)\b[^>]*>.*?<\s*/\s*\1\s*>',
    re.IGNORECASE | re.DOTALL,
)


class _LinkSafetyFilter(html5lib_shim.Filter):
    """Fuerza target/rel seguros en los enlaces para evitar tabnabbing."""

    def __iter__(self):
        for token in super().__iter__():
            if token.get('type') in ('StartTag', 'EmptyTag') and token.get('name') == 'a':
                token.setdefault('data', {})
                token['data'][(None, 'target')] = '_blank'
                token['data'][(None, 'rel')] = 'noopener noreferrer'
            yield token


_cleaner = bleach.sanitizer.Cleaner(
    tags=ALLOWED_TAGS,
    attributes=ALLOWED_ATTRIBUTES,
    protocols=ALLOWED_PROTOCOLS,
    strip=True,
    strip_comments=True,
    filters=[_LinkSafetyFilter],
)


def sanitize_rich_text(value):
    """Devuelve `value` sin nada ejecutable, conservando el formato permitido.

    Acepta tanto HTML del editor como el texto plano que ya está cargado en la
    base: el texto plano atraviesa el saneado sin modificaciones.
    """
    if not value:
        return ''

    return _cleaner.clean(_SCRIPT_OR_STYLE.sub('', value))


# Corre sobre HTML ya saneado, así que alcanza con sacar las etiquetas: no es un
# control de seguridad, sólo sirve para decidir si quedó texto visible.
_ANY_TAG = re.compile(r'<[^>]+>')

# Espacio duro (&nbsp;): visualmente es blanco, así que no cuenta como contenido.
_NBSP = '\xa0'


def rich_text_is_empty(value):
    """¿El HTML no tiene texto visible?

    Un editor vacío no manda '' sino markup vacío (`<p></p>`, `<p><br></p>`),
    que en un campo obligatorio pasaría como contenido válido.
    """
    if not value:
        return True

    texto = html_module.unescape(_ANY_TAG.sub('', value))

    return not texto.replace(_NBSP, ' ').strip()
