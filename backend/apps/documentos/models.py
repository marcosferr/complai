import uuid
from django.db import models
from django.conf import settings
from decouple import config


def document_upload_path(instance, filename):
    """Generate unique path for document uploads"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f"documents/{filename}"


def historial_archivo_upload_path(instance, filename):
    """Generate unique path for file history uploads"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f"documents/history/{filename}"


class DocumentoLegal(models.Model):
    """Legal document model for contracts and regulations"""
    TIPO_CHOICES = [
        ('CONTRATO', 'Contrato'),
        ('PBC', 'Pliego de Bases y Condiciones PBC'),
        ('LEYES_REGULACIONES', 'Leyes y Regulaciones'),
        ('RFP_PROPUESTA', 'RFP/Propuesta'),
        ('POLITICAS', 'Políticas'),
        ('TERMINOS_CONDICIONES', 'Términos y Condiciones'),
        ('ACUERDO', 'Acuerdo'),
    ]
    
    ESTADO_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('ACTIVO', 'Activo'),
        ('VENCIDO', 'Vencido'),
        ('ARCHIVADO', 'Archivado'),
    ]
    
    ESTADO_ADENDA_CHOICES = [
        ('VIGENTE', 'Vigente'),
        ('REEMPLAZADA', 'Reemplazada'),
        ('ANULADA', 'Anulada'),
    ]
    
    titulo = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    archivo = models.FileField(upload_to=document_upload_path)
    contenido_extraido = models.TextField(blank=True)
    resumen_ia = models.TextField(blank=True)  # AI-generated summary
    fecha_vencimiento = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='BORRADOR')
    
    # Document Relationships
    documento_padre = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documentos_hijos',
        verbose_name='Documento padre'
    )
    es_adenda = models.BooleanField(default=False, verbose_name='Es adenda')
    estado_adenda = models.CharField(
        max_length=20,
        choices=ESTADO_ADENDA_CHOICES,
        null=True,
        blank=True,
        verbose_name='Estado de la adenda'
    )
    numero_adenda = models.PositiveIntegerField(null=True, blank=True, verbose_name='Número de adenda')
    
    # Auxiliary Documents - many-to-many relationship for cross-referencing
    documentos_auxiliares = models.ManyToManyField(
        'self',
        symmetrical=False,
        blank=True,
        related_name='referenciado_por',
        verbose_name='Documentos auxiliares'
    )
    
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='documentos_creados'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    ultima_modificacion = models.DateTimeField(auto_now=True)
    version = models.PositiveIntegerField(default=1)
    esta_activo = models.BooleanField(default=True)
    
    # Metadata
    etiquetas = models.JSONField(default=list)
    palabras_clave = models.JSONField(default=list)
    posiciones_grafo = models.JSONField(default=dict, blank=True)
    
    # Pinning functionality
    fijado = models.BooleanField(default=False, verbose_name='Fijado')
    fecha_fijado = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de fijado')
    
    # AI Processing fields
    ESTADO_PROCESAMIENTO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('PROCESANDO', 'Procesando'),
        ('COMPLETADO', 'Completado'),
        ('ERROR', 'Error'),
    ]
    estado_procesamiento_ia = models.CharField(
        max_length=20, 
        choices=ESTADO_PROCESAMIENTO_CHOICES, 
        default='PENDIENTE',
        verbose_name='Estado de procesamiento IA'
    )
    error_procesamiento = models.TextField(blank=True, verbose_name='Error de procesamiento')
    transcripcion_editable = models.TextField(blank=True, verbose_name='Transcripción editable')
    clausulas_extraidas_ia = models.JSONField(default=list, blank=True, verbose_name='Cláusulas extraídas por IA')
    fecha_procesamiento = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de procesamiento')
    
    class Meta:
        db_table = 'documentos_legales'
        ordering = ['-fijado', '-fecha_fijado', '-fecha_creacion']
        indexes = [
            models.Index(fields=['tipo']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_vencimiento']),
        ]
    
    def __str__(self):
        return self.titulo
    
    @property
    def filename(self):
        return self.archivo.name.split('/')[-1] if self.archivo else None
    
    @property
    def file_size(self):
        return self.archivo.size if self.archivo else 0
    
    @property
    def is_expired(self):
        if self.fecha_vencimiento:
            from django.utils import timezone
            return timezone.now().date() > self.fecha_vencimiento
        return False


class VersionDocumento(models.Model):
    """Document version history"""
    documento = models.ForeignKey(
        DocumentoLegal, 
        on_delete=models.CASCADE, 
        related_name='versiones'
    )
    version = models.PositiveIntegerField()
    archivo = models.FileField(upload_to=document_upload_path)
    cambios = models.TextField(blank=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'versiones_documento'
        unique_together = ['documento', 'version']
        ordering = ['-version']


def adenda_upload_path(instance, filename):
    """Generate unique path for addendum uploads"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f"adendas/{filename}"


class Adenda(models.Model):
    """Addendum model - modifications to base documents"""
    ESTADO_CHOICES = [
        ('VIGENTE', 'Vigente'),
        ('REEMPLAZADA', 'Reemplazada'),
        ('ANULADA', 'Anulada'),
    ]
    
    documento_base = models.ForeignKey(
        DocumentoLegal,
        on_delete=models.CASCADE,
        related_name='adendas',
        verbose_name='Documento base'
    )
    numero = models.PositiveIntegerField(verbose_name='Número de adenda')
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    archivo = models.FileField(upload_to=adenda_upload_path)
    fecha_vigencia = models.DateField(verbose_name='Fecha de vigencia')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='VIGENTE'
    )
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='adendas_creadas'
    )
    
    # Processing fields
    contenido_extraido = models.TextField(blank=True)
    estado_procesamiento_ia = models.CharField(
        max_length=20,
        choices=DocumentoLegal.ESTADO_PROCESAMIENTO_CHOICES,
        default='PENDIENTE'
    )
    
    class Meta:
        db_table = 'adendas'
        ordering = ['-fecha_vigencia', '-numero']
        unique_together = ['documento_base', 'numero']
        indexes = [
            models.Index(fields=['documento_base', 'estado']),
            models.Index(fields=['fecha_vigencia']),
        ]
    
    def __str__(self):
        return f"Adenda #{self.numero} - {self.titulo}"
    
    @property
    def filename(self):
        return self.archivo.name.split('/')[-1] if self.archivo else None


class VersionClausula(models.Model):
    """Clause version history - tracks changes via addendums"""
    from apps.clausulas.models import Clausula
    
    clausula = models.ForeignKey(
        'clausulas.Clausula',
        on_delete=models.CASCADE,
        related_name='versiones',
        verbose_name='Cláusula'
    )
    adenda = models.ForeignKey(
        Adenda,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='clausulas_modificadas',
        verbose_name='Adenda que modifica'
    )
    numero_version = models.PositiveIntegerField()
    contenido = models.TextField()
    observaciones = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    activa = models.BooleanField(default=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    
    class Meta:
        db_table = 'versiones_clausula'
        ordering = ['-numero_version']
        indexes = [
            models.Index(fields=['clausula', 'activa']),
            models.Index(fields=['adenda']),
        ]
    
    def __str__(self):
        adenda_info = f" (Adenda #{self.adenda.numero})" if self.adenda else " (Original)"
        return f"Versión {self.numero_version} - {self.clausula.titulo}{adenda_info}"


class HistorialArchivo(models.Model):
    """File upload history for documents"""
    documento = models.ForeignKey(
        DocumentoLegal,
        on_delete=models.CASCADE,
        related_name='historial_archivos',
        verbose_name='Documento'
    )
    archivo = models.FileField(upload_to=historial_archivo_upload_path)
    version_numero = models.PositiveIntegerField()
    notas = models.TextField(blank=True)
    fecha_subida = models.DateTimeField(auto_now_add=True)
    subido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='archivos_subidos'
    )
    tamano_archivo = models.BigIntegerField(default=0)
    
    class Meta:
        db_table = 'historial_archivos'
        ordering = ['-fecha_subida']
        indexes = [
            models.Index(fields=['documento', 'version_numero']),
        ]
    
    def __str__(self):
        return f"Versión {self.version_numero} - {self.documento.titulo}"
    
    @property
    def filename(self):
        return self.archivo.name.split('/')[-1] if self.archivo else None
    
    def save(self, *args, **kwargs):
        if self.archivo:
            self.tamano_archivo = self.archivo.size
        super().save(*args, **kwargs)