"""Pruebas de la corrección de título y fecha de vencimiento de una obligación.

Cubre el endpoint nuevo (`/api/tareas/<pk>/editar/`) y, sobre todo, la regresión del
agujero que cerró: antes cualquiera que viera la obligación podía correr su propia fecha
límite por el PATCH genérico, sin dejar rastro.
"""
from datetime import date, timedelta

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import Usuario
from apps.notificaciones.models import NotificacionConfiguracion

from .models import Area, CambioCampoTarea, TareaCumplimiento


class EditarObligacionTests(APITestCase):
    """PATCH /api/tareas/<pk>/editar/"""

    def setUp(self):
        self.vencimiento_original = date.today() + timedelta(days=30)
        self.vencimiento_nuevo = self.vencimiento_original + timedelta(days=15)

        # Usuario.save() exige área para todo rol que no sea Oficial de Compliance.
        self.area = Area.objects.create(nombre='Infraestructura')
        self.analista = Usuario.objects.create_user(
            username='analista', email='analista@uni.edu.py',
            password='x', role='ANALISTA_UOC', area=self.area
        )
        self.responsable = Usuario.objects.create_user(
            username='responsable', email='responsable@uni.edu.py',
            password='x', role='RESPONSABLE', area=self.area
        )
        self.tarea = TareaCumplimiento.objects.create(
            titulo='Presentar informe de avance',
            descripcion='Descripción original',
            fecha_vencimiento=self.vencimiento_original,
        )
        self.tarea.responsables.add(self.responsable)

        self.url_editar = reverse('tarea-editar-obligacion', args=[self.tarea.pk])
        self.url_generica = reverse('tarea-detail', args=[self.tarea.pk])

    # --- camino feliz -----------------------------------------------------

    def test_analista_cambia_la_fecha_con_motivo(self):
        self.client.force_authenticate(self.analista)
        respuesta = self.client.patch(self.url_editar, {
            'fecha_vencimiento': self.vencimiento_nuevo.isoformat(),
            'motivo': 'Prórroga otorgada por la Autoridad',
        }, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.tarea.refresh_from_db()
        self.assertEqual(self.tarea.fecha_vencimiento, self.vencimiento_nuevo)

        registros = CambioCampoTarea.objects.filter(tarea=self.tarea)
        self.assertEqual(registros.count(), 1)
        registro = registros.first()
        self.assertEqual(registro.campo, 'fecha_vencimiento')
        self.assertEqual(registro.valor_anterior, self.vencimiento_original.isoformat())
        self.assertEqual(registro.valor_nuevo, self.vencimiento_nuevo.isoformat())
        self.assertEqual(registro.motivo, 'Prórroga otorgada por la Autoridad')
        self.assertEqual(registro.usuario, self.analista)
        self.assertEqual(registro.rol_usuario, 'ANALISTA_UOC')

    def test_titulo_no_exige_motivo(self):
        self.client.force_authenticate(self.analista)
        respuesta = self.client.patch(
            self.url_editar, {'titulo': 'Presentar informe de avance anual'}, format='json'
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.tarea.refresh_from_db()
        self.assertEqual(self.tarea.titulo, 'Presentar informe de avance anual')
        registro = CambioCampoTarea.objects.get(tarea=self.tarea, campo='titulo')
        self.assertEqual(registro.valor_anterior, 'Presentar informe de avance')
        self.assertEqual(registro.motivo, '')

    def test_cambiar_ambos_campos_deja_un_registro_por_campo(self):
        self.client.force_authenticate(self.analista)
        respuesta = self.client.patch(self.url_editar, {
            'titulo': 'Informe de avance anual',
            'fecha_vencimiento': self.vencimiento_nuevo.isoformat(),
            'motivo': 'Reprogramación acordada',
        }, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(CambioCampoTarea.objects.filter(tarea=self.tarea).count(), 2)

    def test_la_respuesta_incluye_los_cambios(self):
        """El frontend refresca la línea de tiempo con lo que devuelve el endpoint."""
        self.client.force_authenticate(self.analista)
        respuesta = self.client.patch(self.url_editar, {
            'fecha_vencimiento': self.vencimiento_nuevo.isoformat(),
            'motivo': 'Prórroga',
        }, format='json')

        cambios = respuesta.data['tarea']['cambios_campos']
        self.assertEqual(len(cambios), 1)
        self.assertEqual(cambios[0]['campo_display'], 'Fecha de Vencimiento')

    # --- validaciones -----------------------------------------------------

    def test_mover_la_fecha_sin_motivo_es_rechazado(self):
        self.client.force_authenticate(self.analista)
        respuesta = self.client.patch(self.url_editar, {
            'fecha_vencimiento': self.vencimiento_nuevo.isoformat(),
        }, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('motivo', respuesta.data)
        self.tarea.refresh_from_db()
        self.assertEqual(self.tarea.fecha_vencimiento, self.vencimiento_original)
        self.assertFalse(CambioCampoTarea.objects.filter(tarea=self.tarea).exists())

    def test_motivo_en_blanco_cuenta_como_ausente(self):
        self.client.force_authenticate(self.analista)
        respuesta = self.client.patch(self.url_editar, {
            'fecha_vencimiento': self.vencimiento_nuevo.isoformat(),
            'motivo': '    ',
        }, format='json')
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_titulo_vacio_es_rechazado(self):
        self.client.force_authenticate(self.analista)
        respuesta = self.client.patch(self.url_editar, {'titulo': '   '}, format='json')
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.tarea.refresh_from_db()
        self.assertEqual(self.tarea.titulo, 'Presentar informe de avance')

    def test_fecha_con_formato_invalido_es_rechazada(self):
        self.client.force_authenticate(self.analista)
        respuesta = self.client.patch(self.url_editar, {
            'fecha_vencimiento': '15/10/2026', 'motivo': 'Prórroga',
        }, format='json')
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('fecha_vencimiento', respuesta.data)

    def test_sin_ningun_campo_es_rechazado(self):
        self.client.force_authenticate(self.analista)
        respuesta = self.client.patch(self.url_editar, {'motivo': 'Algo'}, format='json')
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mandar_el_mismo_valor_no_registra_nada(self):
        self.client.force_authenticate(self.analista)
        respuesta = self.client.patch(self.url_editar, {
            'titulo': 'Presentar informe de avance',
            'fecha_vencimiento': self.vencimiento_original.isoformat(),
        }, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertFalse(CambioCampoTarea.objects.filter(tarea=self.tarea).exists())

    # --- permisos ---------------------------------------------------------

    def test_responsable_no_puede_editar(self):
        self.client.force_authenticate(self.responsable)
        respuesta = self.client.patch(self.url_editar, {
            'fecha_vencimiento': self.vencimiento_nuevo.isoformat(),
            'motivo': 'Necesito más tiempo',
        }, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        self.tarea.refresh_from_db()
        self.assertEqual(self.tarea.fecha_vencimiento, self.vencimiento_original)

    def test_anonimo_no_puede_editar(self):
        respuesta = self.client.patch(self.url_editar, {'titulo': 'Otro'}, format='json')
        self.assertIn(
            respuesta.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
        )

    # --- regresión: el agujero que se cerró -------------------------------

    def test_patch_generico_ya_no_puede_mover_la_fecha(self):
        """Antes, un RESPONSABLE corría su propia fecha límite sin dejar rastro."""
        self.client.force_authenticate(self.responsable)
        self.client.patch(self.url_generica, {
            'fecha_vencimiento': self.vencimiento_nuevo.isoformat(),
        }, format='json')

        self.tarea.refresh_from_db()
        self.assertEqual(self.tarea.fecha_vencimiento, self.vencimiento_original)
        self.assertFalse(CambioCampoTarea.objects.filter(tarea=self.tarea).exists())

    def test_patch_generico_ya_no_puede_cambiar_el_titulo(self):
        self.client.force_authenticate(self.analista)
        self.client.patch(self.url_generica, {'titulo': 'Título colado'}, format='json')

        self.tarea.refresh_from_db()
        self.assertEqual(self.tarea.titulo, 'Presentar informe de avance')

    # --- integración con notificaciones -----------------------------------

    def test_cambiar_la_fecha_reprograma_los_avisos(self):
        """La señal post_save resetea los avisos ya enviados: exige tarea.save()."""
        config = NotificacionConfiguracion.objects.create(
            tarea=self.tarea, intervalos_dias=[7, 1], habilitada=True,
            notificaciones_enviadas={'7': '2026-08-01'},
        )
        self.client.force_authenticate(self.analista)
        self.client.patch(self.url_editar, {
            'fecha_vencimiento': self.vencimiento_nuevo.isoformat(),
            'motivo': 'Prórroga otorgada por la Autoridad',
        }, format='json')

        config.refresh_from_db()
        self.assertEqual(config.notificaciones_enviadas, {})
