import uuid
from django.db import models
from django.conf import settings


def auditoria_upload_path(instance, filename):
    """Generate unique path for auditoria document uploads"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f"auditorias/{filename}"


class Auditoria(models.Model):
    """Model for compliance audits"""
    ESTADO_CHOICES = [
        ('PROGRAMADA', 'Programada'),
        ('EN_PROGRESO', 'En Progreso'),
        ('COMPLETADA', 'Completada'),
        ('CANCELADA', 'Cancelada'),
    ]
    
    titulo = models.CharField(max_length=200, verbose_name='Título')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    fecha_programada = models.DateField(verbose_name='Fecha Programada')
    fecha_inicio = models.DateField(null=True, blank=True, verbose_name='Fecha de Inicio')
    fecha_finalizacion = models.DateField(null=True, blank=True, verbose_name='Fecha de Finalización')
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='PROGRAMADA',
        verbose_name='Estado'
    )
    
    # Relationships
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='auditorias_responsable',
        verbose_name='Responsable'
    )
    equipo = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='auditorias_equipo',
        blank=True,
        verbose_name='Equipo de Auditoría'
    )
    
    # Results and notes
    hallazgos = models.TextField(blank=True, verbose_name='Hallazgos')
    recomendaciones = models.TextField(blank=True, verbose_name='Recomendaciones')
    conclusion = models.TextField(blank=True, verbose_name='Conclusión')
    
    # Metadata
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='auditorias_creadas',
        verbose_name='Creado por'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    ultima_modificacion = models.DateTimeField(auto_now=True, verbose_name='Última Modificación')
    
    class Meta:
        db_table = 'auditorias'
        ordering = ['-fecha_programada']
        indexes = [
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_programada']),
        ]
        verbose_name = 'Auditoría'
        verbose_name_plural = 'Auditorías'
    
    def __str__(self):
        return f"{self.titulo} - {self.fecha_programada}"


class DocumentoAuditoria(models.Model):
    """Relationship between audits and documents"""
    auditoria = models.ForeignKey(
        Auditoria,
        on_delete=models.CASCADE,
        related_name='documentos',
        verbose_name='Auditoría'
    )
    documento = models.ForeignKey(
        'documentos.DocumentoLegal',
        on_delete=models.CASCADE,
        related_name='auditorias',
        verbose_name='Documento'
    )
    fecha_asignacion = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Asignación')
    notas = models.TextField(blank=True, verbose_name='Notas')
    
    class Meta:
        db_table = 'documentos_auditoria'
        unique_together = ['auditoria', 'documento']
        verbose_name = 'Documento de Auditoría'
        verbose_name_plural = 'Documentos de Auditoría'
    
    def __str__(self):
        return f"{self.auditoria.titulo} - {self.documento.titulo}"


class ArchivoAuditoria(models.Model):
    """Files attached to audits (preparatory or supporting documents)"""
    TIPO_CHOICES = [
        ('PREPARATORIO', 'Documento Preparatorio'),
        ('RESPALDATORIO', 'Documento Respaldatorio'),
        ('OTRO', 'Otro'),
    ]
    
    auditoria = models.ForeignKey(
        Auditoria,
        on_delete=models.CASCADE,
        related_name='archivos',
        verbose_name='Auditoría'
    )
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default='OTRO',
        verbose_name='Tipo de Archivo'
    )
    archivo = models.FileField(
        upload_to=auditoria_upload_path,
        verbose_name='Archivo'
    )
    nombre_archivo = models.CharField(max_length=255, verbose_name='Nombre del Archivo')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    subido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='Subido por'
    )
    fecha_subida = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Subida')
    
    class Meta:
        db_table = 'archivos_auditoria'
        ordering = ['-fecha_subida']
        verbose_name = 'Archivo de Auditoría'
        verbose_name_plural = 'Archivos de Auditoría'
    
    def __str__(self):
        return f"{self.nombre_archivo} ({self.get_tipo_display()})"
