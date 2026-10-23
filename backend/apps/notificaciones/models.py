from django.db import models
from django.conf import settings


class Notificacion(models.Model):
    """Internal notification model for in-app notifications"""
    
    TIPO_CHOICES = [
        ('TAREA_ASIGNADA', 'Tarea Asignada'),
        ('TAREA_VENCIMIENTO', 'Tarea Próxima a Vencer'),
        ('CAMBIO_ESTADO', 'Cambio de Estado'),
        ('CAMBIO_ETAPA', 'Cambio de Etapa'),
        ('COMENTARIO', 'Nuevo Comentario'),
        ('ARCHIVO_SUBIDO', 'Archivo Subido'),
        ('GENERAL', 'General'),
    ]
    
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notificaciones',
        verbose_name='Usuario'
    )
    tipo = models.CharField(
        max_length=30,
        choices=TIPO_CHOICES,
        default='GENERAL',
        verbose_name='Tipo'
    )
    titulo = models.CharField(max_length=500, verbose_name='Título')
    mensaje = models.TextField(verbose_name='Mensaje')
    tarea = models.ForeignKey(
        'tareas.TareaCumplimiento',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notificaciones',
        verbose_name='Tarea relacionada'
    )
    leida = models.BooleanField(default=False, verbose_name='Leída')
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    
    # Metadata adicional en formato JSON
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Metadatos',
        help_text='Información adicional sobre la notificación'
    )
    
    class Meta:
        db_table = 'notificaciones'
        ordering = ['-fecha_creacion']
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        indexes = [
            models.Index(fields=['usuario', 'leida']),
            models.Index(fields=['usuario', 'fecha_creacion']),
            models.Index(fields=['tipo']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.usuario.get_full_name()}"
    
    def marcar_leida(self):
        """Mark notification as read"""
        self.leida = True
        self.save(update_fields=['leida'])


class NotificacionConfiguracion(models.Model):
    """Configuration for scheduled notifications for a task"""
    
    tarea = models.OneToOneField(
        'tareas.TareaCumplimiento',
        on_delete=models.CASCADE,
        related_name='notificacion_config',
        verbose_name='Tarea'
    )
    intervalos_dias = models.JSONField(
        default=list,
        verbose_name='Intervalos en Días',
        help_text='Array de enteros representando días antes del vencimiento (ej: [7, 1])'
    )
    habilitada = models.BooleanField(
        default=True,
        verbose_name='Habilitada'
    )
    notificaciones_enviadas = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Notificaciones Enviadas',
        help_text='Registro de notificaciones enviadas por intervalo (ej: {"7": "2025-11-07"})'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Fecha de Actualización'
    )
    
    class Meta:
        db_table = 'notificaciones_configuracion'
        verbose_name = 'Configuración de Notificación'
        verbose_name_plural = 'Configuraciones de Notificaciones'
        indexes = [
            models.Index(fields=['habilitada']),
            models.Index(fields=['tarea']),
        ]
    
    def __str__(self):
        intervalos_str = ', '.join(str(i) for i in self.intervalos_dias) if self.intervalos_dias else 'Sin intervalos'
        return f"Notificaciones para {self.tarea.titulo}: {intervalos_str} días antes"
    
    def resetear_notificaciones_enviadas(self):
        """Reset sent notifications tracking"""
        self.notificaciones_enviadas = {}
        self.save(update_fields=['notificaciones_enviadas'])
