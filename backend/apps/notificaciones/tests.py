"""
Tests for notifications app
"""
from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status

from apps.tareas.models import TareaCumplimiento, Area, ComentarioTarea, ArchivoRespaldo
from apps.notificaciones.models import NotificacionConfiguracion, Notificacion
from apps.notificaciones.serializers import NotificacionConfiguracionSerializer
from apps.notificaciones.services import NotificationService

Usuario = get_user_model()


class NotificacionConfiguracionModelTest(TestCase):
    """Test NotificacionConfiguracion model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = Usuario.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='OFICIAL_COMPLIANCE'
        )
        
        self.area = Area.objects.create(
            nombre='Test Area',
            descripcion='Test area description'
        )
        
        self.tarea = TareaCumplimiento.objects.create(
            titulo='Test Task',
            descripcion='Test task description',
            area=self.area,
            fecha_vencimiento=date.today() + timedelta(days=30),
            prioridad='MEDIA',
            creado_por=self.user
        )
    
    def test_create_notificacion_config(self):
        """Test creating a notification configuration"""
        config = NotificacionConfiguracion.objects.create(
            tarea=self.tarea,
            intervalos_dias=[7, 1],
            habilitada=True
        )
        
        self.assertEqual(config.tarea, self.tarea)
        self.assertEqual(config.intervalos_dias, [7, 1])
        self.assertTrue(config.habilitada)
        self.assertEqual(config.notificaciones_enviadas, {})
    
    def test_resetear_notificaciones_enviadas(self):
        """Test resetting sent notifications"""
        config = NotificacionConfiguracion.objects.create(
            tarea=self.tarea,
            intervalos_dias=[7, 1],
            habilitada=True,
            notificaciones_enviadas={'7': '2025-11-07', '1': '2025-11-13'}
        )
        
        config.resetear_notificaciones_enviadas()
        self.assertEqual(config.notificaciones_enviadas, {})
    
    def test_one_to_one_relationship(self):
        """Test that only one config can exist per task"""
        NotificacionConfiguracion.objects.create(
            tarea=self.tarea,
            intervalos_dias=[7, 1],
            habilitada=True
        )
        
        # Creating another config for the same task should raise an error
        with self.assertRaises(Exception):
            NotificacionConfiguracion.objects.create(
                tarea=self.tarea,
                intervalos_dias=[3],
                habilitada=True
            )


class NotificacionConfiguracionSerializerTest(TestCase):
    """Test NotificacionConfiguracionSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = Usuario.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='OFICIAL_COMPLIANCE'
        )
        
        self.area = Area.objects.create(
            nombre='Test Area',
            descripcion='Test area description'
        )
        
        self.tarea = TareaCumplimiento.objects.create(
            titulo='Test Task',
            descripcion='Test task description',
            area=self.area,
            fecha_vencimiento=date.today() + timedelta(days=30),
            prioridad='MEDIA',
            creado_por=self.user
        )
    
    def test_validate_intervalos_dias_valid(self):
        """Test validation of valid intervals"""
        serializer = NotificacionConfiguracionSerializer(data={
            'intervalos_dias': [30, 14, 7, 3, 1],
            'habilitada': True
        })
        
        self.assertTrue(serializer.is_valid())
        # Intervals should be sorted in descending order and unique
        self.assertEqual(serializer.validated_data['intervalos_dias'], [30, 14, 7, 3, 1])
    
    def test_validate_intervalos_dias_remove_duplicates(self):
        """Test that duplicates are removed"""
        serializer = NotificacionConfiguracionSerializer(data={
            'intervalos_dias': [7, 7, 1, 1, 3],
            'habilitada': True
        })
        
        self.assertTrue(serializer.is_valid())
        # Should remove duplicates and sort
        self.assertEqual(serializer.validated_data['intervalos_dias'], [7, 3, 1])
    
    def test_validate_intervalos_dias_invalid_range(self):
        """Test validation fails for invalid range"""
        # Test negative interval
        serializer = NotificacionConfiguracionSerializer(data={
            'intervalos_dias': [-1, 7, 1],
            'habilitada': True
        })
        
        self.assertFalse(serializer.is_valid())
        
        # Test interval > 365
        serializer = NotificacionConfiguracionSerializer(data={
            'intervalos_dias': [366, 7, 1],
            'habilitada': True
        })
        
        self.assertFalse(serializer.is_valid())
    
    def test_validate_intervalos_dias_invalid_type(self):
        """Test validation fails for invalid types"""
        serializer = NotificacionConfiguracionSerializer(data={
            'intervalos_dias': ['seven', 1],
            'habilitada': True
        })
        
        self.assertFalse(serializer.is_valid())
    
    def test_proximas_notificaciones_calculation(self):
        """Test calculation of upcoming notifications"""
        config = NotificacionConfiguracion.objects.create(
            tarea=self.tarea,
            intervalos_dias=[7, 1],
            habilitada=True
        )
        
        serializer = NotificacionConfiguracionSerializer(config)
        proximas = serializer.data['proximas_notificaciones']
        
        # Should have 2 upcoming notifications
        self.assertEqual(len(proximas), 2)
        
        # Check structure
        for notif in proximas:
            self.assertIn('intervalo_dias', notif)
            self.assertIn('fecha_envio', notif)
            self.assertIn('enviada', notif)
            self.assertIn('fecha_enviada', notif)
    
    def test_proximas_notificaciones_with_sent(self):
        """Test calculation with some notifications already sent"""
        config = NotificacionConfiguracion.objects.create(
            tarea=self.tarea,
            intervalos_dias=[7, 1],
            habilitada=True,
            notificaciones_enviadas={'7': '2025-11-23'}
        )
        
        serializer = NotificacionConfiguracionSerializer(config)
        proximas = serializer.data['proximas_notificaciones']
        
        # Find the 7-day notification
        notif_7 = next((n for n in proximas if n['intervalo_dias'] == 7), None)
        self.assertIsNotNone(notif_7)
        self.assertTrue(notif_7['enviada'])
        self.assertEqual(notif_7['fecha_enviada'], '2025-11-23')


class NotificacionConfiguracionAPITest(APITestCase):
    """Test NotificacionConfiguracion API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.user = Usuario.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='OFICIAL_COMPLIANCE'
        )
        
        self.area = Area.objects.create(
            nombre='Test Area',
            descripcion='Test area description'
        )
        
        self.tarea = TareaCumplimiento.objects.create(
            titulo='Test Task',
            descripcion='Test task description',
            area=self.area,
            fecha_vencimiento=date.today() + timedelta(days=30),
            prioridad='MEDIA',
            creado_por=self.user
        )
        
        self.config = NotificacionConfiguracion.objects.create(
            tarea=self.tarea,
            intervalos_dias=[7, 1],
            habilitada=True
        )
        
        # Authenticate
        self.client.force_authenticate(user=self.user)
    
    def test_retrieve_config_by_tarea_id(self):
        """Test retrieving config by tarea_id"""
        url = f'/api/notificaciones/configuracion/{self.tarea.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['tarea'], self.tarea.id)
        self.assertEqual(response.data['intervalos_dias'], [7, 1])
    
    def test_update_config(self):
        """Test updating config"""
        url = f'/api/notificaciones/configuracion/{self.tarea.id}/'
        data = {
            'intervalos_dias': [14, 7, 3, 1],
            'habilitada': True
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['intervalos_dias'], [14, 7, 3, 1])
        
        # Verify in database
        self.config.refresh_from_db()
        self.assertEqual(self.config.intervalos_dias, [14, 7, 3, 1])
    
    def test_preview_notifications(self):
        """Test preview action"""
        url = f'/api/notificaciones/configuracion/{self.tarea.id}/preview/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('proximas_notificaciones', response.data)
        self.assertIn('tarea_id', response.data)


class ComentarioNotificationTest(TestCase):
    """Test notifications for new comments"""
    
    def setUp(self):
        """Set up test data"""
        # Create area
        self.area = Area.objects.create(
            nombre='Test Area',
            descripcion='Test area'
        )
        
        # Create users with different roles
        self.oficial = Usuario.objects.create_user(
            email='oficial@test.com',
            password='test123',
            first_name='Oficial',
            last_name='Test',
            role='OFICIAL_COMPLIANCE'
        )
        
        self.analista = Usuario.objects.create_user(
            email='analista@test.com',
            password='test123',
            first_name='Analista',
            last_name='Test',
            role='ANALISTA_COMPLIANCE'
        )
        
        self.gerente = Usuario.objects.create_user(
            email='gerente@test.com',
            password='test123',
            first_name='Gerente',
            last_name='Test',
            role='GERENTE',
            area=self.area
        )
        
        self.responsable = Usuario.objects.create_user(
            email='responsable@test.com',
            password='test123',
            first_name='Responsable',
            last_name='Test',
            role='RESPONSABLE',
            area=self.area
        )
        
        # Create task
        self.tarea = TareaCumplimiento.objects.create(
            titulo='Test Task',
            descripcion='Test task',
            area=self.area,
            fecha_vencimiento=date.today() + timedelta(days=30),
            prioridad='MEDIA',
            creado_por=self.oficial
        )
        self.tarea.responsables.add(self.responsable)
    
    def test_comment_creates_notifications(self):
        """Test that creating a comment triggers notifications"""
        # Create comment
        comentario = ComentarioTarea.objects.create(
            tarea=self.tarea,
            usuario=self.responsable,
            texto='Test comment'
        )
        
        # Check notifications were created
        notificaciones = Notificacion.objects.filter(
            tipo='COMENTARIO',
            tarea=self.tarea
        )
        
        # Should have notifications for oficial, analista, and gerente
        # but NOT for the responsable (author)
        self.assertGreaterEqual(notificaciones.count(), 3)
        
        # Verify oficial received notification
        self.assertTrue(notificaciones.filter(usuario=self.oficial).exists())
        
        # Verify analista received notification
        self.assertTrue(notificaciones.filter(usuario=self.analista).exists())
        
        # Verify gerente received notification (same area)
        self.assertTrue(notificaciones.filter(usuario=self.gerente).exists())
        
        # Verify author did NOT receive notification
        self.assertFalse(notificaciones.filter(usuario=self.responsable).exists())
    
    def test_get_usuarios_to_notify_with_gerente_different_area(self):
        """Test that gerente from different area does NOT receive notification"""
        # Create another area and gerente
        area2 = Area.objects.create(nombre='Other Area')
        gerente2 = Usuario.objects.create_user(
            email='gerente2@test.com',
            password='test123',
            first_name='Gerente2',
            last_name='Test',
            role='GERENTE',
            area=area2
        )
        
        # Create comment
        comentario = ComentarioTarea.objects.create(
            tarea=self.tarea,
            usuario=self.oficial,
            texto='Test comment'
        )
        
        # Check notifications
        notificaciones = Notificacion.objects.filter(
            tipo='COMENTARIO',
            tarea=self.tarea
        )
        
        # Gerente from different area should NOT receive notification
        self.assertFalse(notificaciones.filter(usuario=gerente2).exists())


class ArchivoNotificationTest(TestCase):
    """Test notifications for file uploads"""
    
    def setUp(self):
        """Set up test data"""
        # Create area
        self.area = Area.objects.create(
            nombre='Test Area',
            descripcion='Test area'
        )
        
        # Create users
        self.oficial = Usuario.objects.create_user(
            email='oficial@test.com',
            password='test123',
            first_name='Oficial',
            last_name='Test',
            role='OFICIAL_COMPLIANCE'
        )
        
        self.responsable = Usuario.objects.create_user(
            email='responsable@test.com',
            password='test123',
            first_name='Responsable',
            last_name='Test',
            role='RESPONSABLE',
            area=self.area
        )
        
        # Create task
        self.tarea = TareaCumplimiento.objects.create(
            titulo='Test Task',
            descripcion='Test task',
            area=self.area,
            fecha_vencimiento=date.today() + timedelta(days=30),
            prioridad='MEDIA',
            creado_por=self.oficial
        )
        self.tarea.responsables.add(self.responsable)
    
    def test_file_upload_creates_notifications(self):
        """Test that uploading a file triggers notifications"""
        # Create fake file
        archivo_content = b'Test file content'
        archivo = SimpleUploadedFile(
            'test.pdf',
            archivo_content,
            content_type='application/pdf'
        )
        
        # Upload file
        archivo_respaldo = ArchivoRespaldo.objects.create(
            tarea=self.tarea,
            archivo=archivo,
            nombre_original='test.pdf',
            descripcion='Test file',
            tipo_mime='application/pdf',
            subido_por=self.responsable,
            tamanio=len(archivo_content)
        )
        
        # Check notifications were created
        notificaciones = Notificacion.objects.filter(
            tipo='ARCHIVO_SUBIDO',
            tarea=self.tarea
        )
        
        # Should have notification for oficial
        self.assertGreaterEqual(notificaciones.count(), 1)
        
        # Verify oficial received notification
        self.assertTrue(notificaciones.filter(usuario=self.oficial).exists())
        
        # Verify uploader did NOT receive notification
        self.assertFalse(notificaciones.filter(usuario=self.responsable).exists())
    
    def test_notification_metadata(self):
        """Test that notification has correct metadata"""
        # Create fake file
        archivo_content = b'Test file content'
        archivo = SimpleUploadedFile(
            'test.pdf',
            archivo_content,
            content_type='application/pdf'
        )
        
        # Upload file
        archivo_respaldo = ArchivoRespaldo.objects.create(
            tarea=self.tarea,
            archivo=archivo,
            nombre_original='test.pdf',
            descripcion='Test file',
            tipo_mime='application/pdf',
            subido_por=self.responsable,
            tamanio=len(archivo_content)
        )
        
        # Get notification
        notificacion = Notificacion.objects.filter(
            tipo='ARCHIVO_SUBIDO',
            tarea=self.tarea,
            usuario=self.oficial
        ).first()
        
        self.assertIsNotNone(notificacion)
        self.assertEqual(notificacion.metadata['archivo_id'], archivo_respaldo.id)
        self.assertEqual(notificacion.metadata['uploader_id'], self.responsable.id)
        self.assertEqual(notificacion.metadata['archivo_nombre'], 'test.pdf')


class NotificacionSerializerTest(TestCase):
    """Test the improved notification serializer"""
    
    def setUp(self):
        """Set up test data"""
        from apps.notificaciones.serializers import NotificacionSerializer
        
        self.area = Area.objects.create(nombre='Test Area')
        
        self.oficial = Usuario.objects.create_user(
            email='oficial@test.com',
            password='test123',
            first_name='Oficial',
            last_name='Test',
            role='OFICIAL_COMPLIANCE'
        )
        
        self.tarea = TareaCumplimiento.objects.create(
            titulo='Test Task',
            descripcion='Test task description',
            area=self.area,
            fecha_vencimiento=date.today() + timedelta(days=10),
            prioridad='ALTA',
            creado_por=self.oficial
        )
        
        self.notificacion = Notificacion.objects.create(
            usuario=self.oficial,
            tipo='TAREA_ASIGNADA',
            titulo='Test Notification',
            mensaje='Test message',
            tarea=self.tarea,
            metadata={'test': 'data'}
        )
    
    def test_serializer_includes_tarea_detalle(self):
        """Test that serializer includes complete task details"""
        from apps.notificaciones.serializers import NotificacionSerializer
        
        serializer = NotificacionSerializer(self.notificacion)
        data = serializer.data
        
        # Verify tarea_detalle exists
        self.assertIn('tarea_detalle', data)
        self.assertIsNotNone(data['tarea_detalle'])
        
        # Verify task details structure
        tarea_detalle = data['tarea_detalle']
        self.assertEqual(tarea_detalle['id'], self.tarea.id)
        self.assertEqual(tarea_detalle['titulo'], self.tarea.titulo)
        self.assertEqual(tarea_detalle['prioridad'], 'ALTA')
        self.assertEqual(tarea_detalle['prioridad_display'], 'Alta')
        self.assertIn('dias_restantes', tarea_detalle)
        self.assertIn('esta_vencida', tarea_detalle)
        self.assertIn('etapa_actual', tarea_detalle)
        self.assertIn('etapa_actual_display', tarea_detalle)
        
        # Verify area details
        self.assertIsNotNone(tarea_detalle['area'])
        self.assertEqual(tarea_detalle['area']['nombre'], 'Test Area')
    
    def test_detailed_message_format(self):
        """Test that notifications have detailed formatted messages"""
        # Create a new task assignment notification
        NotificationService.notify_task_assignment(self.tarea, [self.oficial])
        
        notif = Notificacion.objects.filter(
            tipo='TAREA_ASIGNADA',
            tarea=self.tarea,
            usuario=self.oficial
        ).order_by('-fecha_creacion').first()
        
        self.assertIsNotNone(notif)
        
        # Verify message contains emojis and structured info
        mensaje = notif.mensaje
        self.assertIn('📋', mensaje)  # Task emoji
        self.assertIn('📅', mensaje)  # Calendar emoji
        self.assertIn('⏰', mensaje)  # Clock emoji
        self.assertIn('⚡', mensaje)  # Priority emoji
        self.assertIn('Test Task', mensaje)
        
        # Verify metadata is enriched
        metadata = notif.metadata
        self.assertIn('prioridad', metadata)
        self.assertIn('etapa', metadata)
        self.assertIn('estado', metadata)
        self.assertIn('fecha_vencimiento', response.data)
