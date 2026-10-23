"""Campos de serializer compartidos entre apps."""

from rest_framework import serializers

from apps.common.sanitize import rich_text_is_empty, sanitize_rich_text


class RichTextField(serializers.CharField):
    """CharField que sanea HTML enriquecido antes de que llegue al modelo.

    Se usa en lugar de escribir un `validate_<campo>` por serializer: al ser un
    campo, el saneado viaja con la declaración y no se puede olvidar al agregar
    un serializer nuevo.
    """

    def to_internal_value(self, data):
        value = sanitize_rich_text(super().to_internal_value(data))

        # El chequeo de vacío de CharField corre sobre el dato crudo, así que
        # `<p></p>` (editor vacío) o `<script>x</script>` (todo prohibido) llegan
        # hasta acá como si tuvieran contenido. Recién ahora se sabe que no.
        if rich_text_is_empty(value):
            if not self.allow_blank:
                self.fail('blank')
            # Guardar '<p></p>' rompería los `if not campo` del resto del código.
            return ''

        return value
