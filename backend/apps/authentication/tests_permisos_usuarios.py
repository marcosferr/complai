"""Regresión de la escalada de privilegios en la administración de usuarios.

Hallazgo C-2 del diagnóstico ISO 27001: `UserListCreateView` y `UserDetailView`
declaraban `permission_classes = [IsAuthenticated]` y el serializer de
actualización exponía `role`, `is_active`, `email` y `password` como escribibles.
Cualquier sesión válida podía ascenderse a sí misma, tomar la cuenta de otra
persona cambiándole la contraseña, o desactivar a cualquiera.

Control: A.5.15 (control de acceso) y A.8.2 (derechos de acceso privilegiado).
"""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.tareas.models import Area

from .models import Usuario


class AdministracionDeUsuariosPermisosTest(APITestCase):
    """Un usuario sin rol administrador no puede tocar cuentas — ni la propia."""

    def setUp(self):
        self.area, _ = Area.objects.get_or_create(nombre='Área de prueba')

        self.responsable = Usuario(
            username='responsable@uni.edu.py',
            email='responsable@uni.edu.py',
            role='RESPONSABLE',
            area=self.area,
        )
        self.responsable.set_password('Clave-Segura-123')
        self.responsable.save()

        self.victima = Usuario(
            username='gerente@uni.edu.py',
            email='gerente@uni.edu.py',
            role='GERENTE',
            area=self.area,
        )
        self.victima.set_password('Clave-Segura-456')
        self.victima.save()

        self.oficial = Usuario(
            username='oficial@uni.edu.py',
            email='oficial@uni.edu.py',
            role='OFICIAL_COMPLIANCE',
        )
        self.oficial.set_password('Clave-Segura-789')
        self.oficial.save()

        self.url_propio = reverse('user-detail', args=[self.responsable.pk])
        self.url_ajeno = reverse('user-detail', args=[self.victima.pk])
        self.url_lista = reverse('user-list-create')

    # -- el ataque original -------------------------------------------------

    def test_responsable_no_puede_ascenderse_a_si_mismo(self):
        self.client.force_authenticate(user=self.responsable)

        respuesta = self.client.patch(self.url_propio, {'role': 'OFICIAL_COMPLIANCE'}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        self.responsable.refresh_from_db()
        self.assertEqual(self.responsable.role, 'RESPONSABLE')

    def test_responsable_no_puede_cambiar_la_contrasena_de_otro(self):
        self.client.force_authenticate(user=self.responsable)

        respuesta = self.client.patch(self.url_ajeno, {'password': 'Tomada-Por-Mi-1'}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        self.victima.refresh_from_db()
        self.assertTrue(self.victima.check_password('Clave-Segura-456'))

    def test_responsable_no_puede_desactivar_a_otro(self):
        self.client.force_authenticate(user=self.responsable)

        respuesta = self.client.patch(self.url_ajeno, {'is_active': False}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        self.victima.refresh_from_db()
        self.assertTrue(self.victima.is_active)

    def test_responsable_no_puede_borrar_a_otro(self):
        self.client.force_authenticate(user=self.responsable)

        respuesta = self.client.delete(self.url_ajeno)

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
        self.victima.refresh_from_db()
        self.assertTrue(self.victima.is_active)

    def test_responsable_no_lista_ni_crea_usuarios(self):
        self.client.force_authenticate(user=self.responsable)

        self.assertEqual(self.client.get(self.url_lista).status_code, status.HTTP_403_FORBIDDEN)

        alta = self.client.post(
            self.url_lista,
            {
                'email': 'colado@uni.edu.py',
                'first_name': 'Colado',
                'last_name': 'Sin Permiso',
                'password': 'Clave-Segura-000',
                'password_confirm': 'Clave-Segura-000',
                'role': 'OFICIAL_COMPLIANCE',
                'area': self.area.pk,
            },
            format='json',
        )
        self.assertEqual(alta.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Usuario.objects.filter(email='colado@uni.edu.py').exists())

    def test_anonimo_no_accede(self):
        self.assertEqual(self.client.get(self.url_lista).status_code, status.HTTP_401_UNAUTHORIZED)

    # -- la administración legítima sigue funcionando -----------------------

    def test_oficial_de_compliance_si_cambia_el_rol(self):
        self.client.force_authenticate(user=self.oficial)

        respuesta = self.client.patch(self.url_propio, {'role': 'GERENTE'}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.responsable.refresh_from_db()
        self.assertEqual(self.responsable.role, 'GERENTE')

    def test_oficial_de_compliance_lista_usuarios(self):
        self.client.force_authenticate(user=self.oficial)

        self.assertEqual(self.client.get(self.url_lista).status_code, status.HTTP_200_OK)


class SerializerCierraLosCamposDePrivilegioTest(APITestCase):
    """El serializer se defiende solo, sin depender del permiso de la vista.

    Si mañana `UserUpdateSerializer` se reusa desde otro endpoint, `role` e
    `is_active` tienen que seguir cerrados para quien no es administrador.
    """

    def setUp(self):
        self.area, _ = Area.objects.get_or_create(nombre='Área de prueba')
        self.responsable = Usuario(
            username='r2@uni.edu.py',
            email='r2@uni.edu.py',
            role='RESPONSABLE',
            area=self.area,
        )
        self.responsable.set_password('Clave-Segura-123')
        self.responsable.save()

    def _serializer_para(self, usuario):
        from rest_framework.test import APIRequestFactory

        from .serializers import UserUpdateSerializer

        request = APIRequestFactory().patch('/')
        request.user = usuario
        return UserUpdateSerializer(instance=self.responsable, context={'request': request})

    def test_campos_de_privilegio_son_de_solo_lectura_para_un_responsable(self):
        serializer = self._serializer_para(self.responsable)

        for campo in ('role', 'is_active', 'email', 'password'):
            self.assertTrue(
                serializer.fields[campo].read_only,
                f'«{campo}» tendría que ser de solo lectura para un rol no administrador',
            )

    def test_campos_de_privilegio_son_escribibles_para_el_oficial(self):
        oficial = Usuario(
            username='o2@uni.edu.py',
            email='o2@uni.edu.py',
            role='OFICIAL_COMPLIANCE',
        )
        oficial.set_password('Clave-Segura-789')
        oficial.save()

        serializer = self._serializer_para(oficial)

        for campo in ('role', 'is_active'):
            self.assertFalse(
                serializer.fields[campo].read_only,
                f'«{campo}» tendría que ser escribible para el administrador',
            )
