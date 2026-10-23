from django.apps import AppConfig


class NotificacionesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notificaciones'
    verbose_name = 'Notificaciones'
    
    def ready(self):
        """Import signals when the app is ready"""
        import apps.notificaciones.signals
