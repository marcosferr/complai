"""Pruebas del cambio de estado de una obligación (`PATCH /api/tareas/<pk>/estado-etapa/`).

Es el endpoint que usa el tablero al arrastrar una tarjeta de columna. Cubre:
- que el historial registre al usuario de la sesión, no lo que mande el cliente;
- la regresión del agujero que cerró `tareas.transiciones`: antes el endpoint aceptaba
  cualquier estado de cualquier etapa si el rol podía tocar la etapa actual;
- que `estados_disponibles` (lo que el frontend usa para habilitar columnas) coincida
  con lo que el endpoint acepta.
"""
from datetime import date, timedelta

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import Usuario

from .models import Area, HistorialEstadoTarea, TareaCumplimiento
from .transiciones import ESTADOS_POR_ETAPA


class CambiarEstadoEtapaTests(APITestCase):

    def setUp(self):
        self.area = Area.objects.create(nombre='Infraestructura')
        self.otra_area = Area.objects.create(nombre='Tecnología')

        def usuario(nombre, rol, area):
            return Usuario.objects.create_user(
                username=nombre, email=f'{nombre}@uni.edu.py',
                password='x', role=rol, area=area,
            )

        self.responsable = usuario('responsable', 'RESPONSABLE', self.area)
        self.otro_responsable = usuario('otro', 'RESPONSABLE', self.area)
        self.gerente = usuario('gerente', 'DIRECTOR', self.area)
        self.gerente_ajeno = usuario('gerente2', 'DIRECTOR', self.otra_area)
        self.analista = usuario('analista', 'ANALISTA_UOC', self.area)
        self.oficial = usuario('oficial', 'ADMINISTRADOR_CONTRATO', None)

        self.tarea = TareaCumplimiento.objects.create(
            titulo='Presentar informe de avance',
            descripcion='Informe trimestral',
            fecha_vencimiento=date.today() + timedelta(days=30),
            area=self.area,
            etapa_actual='INICIO',
            estado_etapa='PENDIENTE',
        )
        self.tarea.responsables.add(self.responsable)
        self.url = reverse('tarea-cambiar-estado-etapa', args=[self.tarea.pk])

    def cambiar(self, quien, estado, **extra):
        self.client.force_authenticate(quien)
        return self.client.patch(self.url, {'estado_etapa': estado, **extra}, format='multipart')

    def assertSinCambios(self):
        self.tarea.refresh_from_db()
        self.assertEqual(self.tarea.etapa_actual, 'INICIO')
        self.assertEqual(self.tarea.estado_etapa, 'PENDIENTE')
        self.assertFalse(HistorialEstadoTarea.objects.filter(tarea=self.tarea).exists())

    # --- camino feliz -----------------------------------------------------

    def test_responsable_asignado_cambia_estado_y_queda_en_el_historial(self):
        respuesta = self.cambiar(
            self.responsable, 'EN_PROGRESO',
            observaciones='Cambio de estado desde el tablero',
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK, respuesta.data)
        self.tarea.refresh_from_db()
        self.assertEqual(self.tarea.estado_etapa, 'EN_PROGRESO')
        self.assertEqual(self.tarea.etapa_actual, 'INICIO')

        registro = HistorialEstadoTarea.objects.get(tarea=self.tarea)
        self.assertEqual(registro.usuario, self.responsable)
        self.assertEqual(registro.rol_usuario, 'RESPONSABLE')
        self.assertEqual(registro.estado_anterior, 'PENDIENTE')
        self.assertEqual(registro.estado_nuevo, 'EN_PROGRESO')
        self.assertEqual(registro.observaciones, 'Cambio de estado desde el tablero')

    def test_el_usuario_del_historial_sale_de_la_sesion(self):
        self.cambiar(
            self.responsable, 'EN_PROGRESO',
            usuario=self.oficial.pk, rol_usuario='ADMINISTRADOR_CONTRATO',
        )

        registro = HistorialEstadoTarea.objects.get(tarea=self.tarea)
        self.assertEqual(registro.usuario, self.responsable)
        self.assertEqual(registro.rol_usuario, 'RESPONSABLE')

    def test_gerente_del_area_cambia_estado(self):
        respuesta = self.cambiar(self.gerente, 'OBSERVADO_DIRECCION')
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK, respuesta.data)

    def test_oficial_puede_mover_a_otra_etapa(self):
        respuesta = self.cambiar(self.oficial, 'VALIDADA')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK, respuesta.data)
        self.tarea.refresh_from_db()
        self.assertEqual(self.tarea.etapa_actual, 'CONTROL_ADMINISTRADOR')
        self.assertEqual(self.tarea.estado_etapa, 'VALIDADA')
        self.assertEqual(HistorialEstadoTarea.objects.get(tarea=self.tarea).usuario, self.oficial)

    # --- regresión: saltar de etapa sin pasar por avanzar/devolver ------------

    def test_responsable_no_puede_saltar_a_aprobado_por_rectorado(self):
        respuesta = self.cambiar(self.responsable, 'APROBADO_RECTORADO')

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('otra etapa', respuesta.data['error'])
        self.assertSinCambios()

    def test_gerente_no_puede_saltar_a_revision_gerencial_por_este_camino(self):
        respuesta = self.cambiar(self.gerente, 'VALIDADO_DIRECCION')
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertSinCambios()

    def test_responsable_no_puede_marcarse_observado_por_el_gerente(self):
        respuesta = self.cambiar(self.responsable, 'OBSERVADO_DIRECCION')
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertSinCambios()

    # --- quién puede --------------------------------------------------------

    def test_responsable_no_asignado_es_rechazado(self):
        respuesta = self.cambiar(self.otro_responsable, 'EN_PROGRESO')
        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        self.assertSinCambios()

    def test_gerente_de_otra_area_es_rechazado(self):
        respuesta = self.cambiar(self.gerente_ajeno, 'EN_PROGRESO')
        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        self.assertSinCambios()

    def test_analista_no_toca_la_etapa_de_inicio(self):
        respuesta = self.cambiar(self.analista, 'EN_PROGRESO')

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        # El mensaje habla en términos de negocio, no con el código interno de la etapa.
        self.assertIn('«Inicio»', respuesta.data['error'])
        self.assertSinCambios()

    def test_estado_inexistente_es_rechazado(self):
        respuesta = self.cambiar(self.oficial, 'CUALQUIERA')
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertSinCambios()

    def test_anonimo_no_puede(self):
        respuesta = self.client.patch(self.url, {'estado_etapa': 'EN_PROGRESO'}, format='multipart')
        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertSinCambios()

    # --- lo que ve el frontend coincide con lo que acepta el endpoint ---------

    def test_estados_disponibles_coinciden_con_lo_que_acepta_el_endpoint(self):
        todos = [codigo for estados in ESTADOS_POR_ETAPA.values() for codigo, _ in estados]

        for usuario in (self.responsable, self.gerente, self.analista):
            self.client.force_authenticate(usuario)
            detalle = self.client.get(reverse('tarea-detail', args=[self.tarea.pk]))
            disponibles = {codigo for codigo, _ in detalle.data['estados_disponibles']}

            for estado in todos:
                with self.subTest(rol=usuario.role, estado=estado):
                    TareaCumplimiento.objects.filter(pk=self.tarea.pk).update(
                        etapa_actual='INICIO', estado_etapa='PENDIENTE'
                    )
                    respuesta = self.cambiar(usuario, estado)
                    self.assertEqual(
                        respuesta.status_code == status.HTTP_200_OK,
                        estado in disponibles,
                        respuesta.data,
                    )
