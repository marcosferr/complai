from django.test import SimpleTestCase
from rest_framework import serializers

from apps.common.fields import RichTextField
from apps.common.sanitize import sanitize_rich_text


class SanitizeRichTextSecurityTests(SimpleTestCase):
    """El saneado es la frontera de seguridad: se guarda lo que devuelve esta función."""

    def test_elimina_la_etiqueta_script_y_su_contenido(self):
        resultado = sanitize_rich_text('<p>Hola</p><script>alert(1)</script>')

        self.assertNotIn('script', resultado)
        self.assertNotIn('alert(1)', resultado)
        self.assertIn('Hola', resultado)

    def test_elimina_atributos_de_evento(self):
        resultado = sanitize_rich_text('<p onerror="alert(1)" onclick="robar()">Texto</p>')

        self.assertNotIn('onerror', resultado)
        self.assertNotIn('onclick', resultado)
        self.assertIn('Texto', resultado)

    def test_descarta_enlaces_con_esquema_javascript(self):
        resultado = sanitize_rich_text('<a href="javascript:alert(1)">click</a>')

        self.assertNotIn('javascript:', resultado)
        self.assertIn('click', resultado)

    def test_elimina_img_con_onerror(self):
        resultado = sanitize_rich_text('<img src=x onerror=alert(1)>')

        self.assertNotIn('onerror', resultado)
        self.assertNotIn('alert', resultado)

    def test_agrega_rel_seguro_a_los_enlaces(self):
        resultado = sanitize_rich_text('<a href="https://uni.edu.py">sitio</a>')

        self.assertIn('href="https://uni.edu.py"', resultado)
        self.assertIn('noopener', resultado)


class SanitizeRichTextPreservationTests(SimpleTestCase):
    """Lo que el editor produce legítimamente tiene que sobrevivir intacto."""

    def test_conserva_el_formato_permitido(self):
        html = (
            '<p>El proveedor <strong>debe</strong>:</p>'
            '<ul><li>Entregar informe</li><li>Notificar en <em>48h</em></li></ul>'
        )

        self.assertEqual(sanitize_rich_text(html), html)

    def test_conserva_listas_ordenadas_y_encabezados(self):
        html = '<h3>Obligaciones</h3><ol><li>Primero</li></ol>'

        self.assertEqual(sanitize_rich_text(html), html)

    def test_texto_plano_pasa_sin_cambios(self):
        self.assertEqual(sanitize_rich_text('Texto sin formato'), 'Texto sin formato')

    def test_conserva_saltos_de_linea_del_texto_plano_existente(self):
        """Los datos ya cargados son texto plano con saltos: no se deben perder."""
        original = 'Primera linea\nSegunda linea'

        self.assertEqual(sanitize_rich_text(original), original)

    def test_valor_vacio_o_nulo_devuelve_cadena_vacia(self):
        self.assertEqual(sanitize_rich_text(''), '')
        self.assertEqual(sanitize_rich_text(None), '')

    def test_no_escapa_los_acentos_del_espanol(self):
        resultado = sanitize_rich_text('<p>Cláusula de rescisión anticipada</p>')

        self.assertIn('Cláusula de rescisión', resultado)


class _SerializerDePrueba(serializers.Serializer):
    """Serializer mínimo para ejercitar el campo tal como se usa en producción."""
    descripcion = RichTextField()
    opcional = RichTextField(required=False, allow_blank=True)


class RichTextFieldTests(SimpleTestCase):
    """El campo es el punto único de saneado: si pasa por acá, se guarda limpio."""

    def test_sanea_el_valor_al_validar(self):
        s = _SerializerDePrueba(data={'descripcion': '<p>Hola</p><script>alert(1)</script>'})

        self.assertTrue(s.is_valid(), s.errors)
        self.assertNotIn('script', s.validated_data['descripcion'])
        self.assertIn('Hola', s.validated_data['descripcion'])

    def test_conserva_el_formato_permitido(self):
        html = '<p>El proveedor <strong>debe</strong> notificar</p>'
        s = _SerializerDePrueba(data={'descripcion': html})

        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data['descripcion'], html)

    def test_rechaza_contenido_que_queda_vacio_tras_sanear(self):
        """'<script>x</script>' no es una descripción válida: no queda nada."""
        s = _SerializerDePrueba(data={'descripcion': '<script>alert(1)</script>'})

        self.assertFalse(s.is_valid())
        self.assertIn('descripcion', s.errors)

    def test_acepta_texto_plano_preexistente(self):
        s = _SerializerDePrueba(data={'descripcion': 'Texto plano\ncon salto'})

        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data['descripcion'], 'Texto plano\ncon salto')

    def test_campo_opcional_acepta_blanco(self):
        s = _SerializerDePrueba(data={'descripcion': 'algo', 'opcional': ''})

        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data['opcional'], '')


class RichTextFieldVacioRealTests(SimpleTestCase):
    """Tiptap no manda '' cuando el editor está vacío: manda markup vacío."""

    def test_parrafo_vacio_no_cuenta_como_contenido(self):
        s = _SerializerDePrueba(data={'descripcion': '<p></p>'})

        self.assertFalse(s.is_valid())
        self.assertIn('descripcion', s.errors)

    def test_parrafo_con_solo_un_br_no_cuenta_como_contenido(self):
        s = _SerializerDePrueba(data={'descripcion': '<p><br></p>'})

        self.assertFalse(s.is_valid())

    def test_markup_con_solo_espacios_no_cuenta_como_contenido(self):
        s = _SerializerDePrueba(data={'descripcion': '<p>   </p>'})

        self.assertFalse(s.is_valid())

    def test_campo_opcional_normaliza_markup_vacio_a_cadena_vacia(self):
        """Guardar '<p></p>' rompería los `if not descripcion` del resto del código."""
        s = _SerializerDePrueba(data={'descripcion': 'algo', 'opcional': '<p></p>'})

        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data['opcional'], '')

    def test_una_lista_con_texto_si_cuenta_como_contenido(self):
        s = _SerializerDePrueba(data={'descripcion': '<ul><li>Entregar informe</li></ul>'})

        self.assertTrue(s.is_valid(), s.errors)
