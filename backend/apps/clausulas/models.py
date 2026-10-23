from django.db import models
from django.conf import settings


class Clausula(models.Model):
    """Clausula (Clause) model for legal documents"""
    documento = models.ForeignKey(
        'documentos.DocumentoLegal',
        on_delete=models.CASCADE,
        related_name='clausulas'
    )
    titulo = models.CharField(max_length=200, verbose_name='Título')
    contenido = models.TextField(verbose_name='Contenido')
    numero_orden = models.PositiveIntegerField(verbose_name='Número de orden')
    etiquetas = models.JSONField(default=list, blank=True, verbose_name='Etiquetas')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    creada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='clausulas_creadas'
    )
    
    class Meta:
        db_table = 'clausulas'
        ordering = ['numero_orden']
        verbose_name = 'Cláusula'
        verbose_name_plural = 'Cláusulas'
        indexes = [
            models.Index(fields=['documento', 'numero_orden']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.documento.titulo}"


class ClausulaRelacionada(models.Model):
    """Related Clause model for establishing relationships between clauses"""
    TIPO_RELACION_CHOICES = [
        ('REFERENCIA', 'Referencia'),
        ('MODIFICACION', 'Modificación'),
        ('DEPENDENCIA', 'Dependencia'),
        ('COMPLEMENTO', 'Complemento'),
        ('EXCEPCION', 'Excepción'),
    ]
    
    clausula_principal = models.ForeignKey(
        Clausula,
        on_delete=models.CASCADE,
        related_name='relaciones_salientes',
        verbose_name='Cláusula principal'
    )
    clausula_relacionada = models.ForeignKey(
        Clausula,
        on_delete=models.CASCADE,
        related_name='relaciones_entrantes',
        verbose_name='Cláusula relacionada'
    )
    tipo_relacion = models.CharField(
        max_length=50,
        choices=TIPO_RELACION_CHOICES,
        verbose_name='Tipo de relación'
    )
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    creada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    
    class Meta:
        db_table = 'clausulas_relacionadas'
        verbose_name = 'Cláusula relacionada'
        verbose_name_plural = 'Cláusulas relacionadas'
        unique_together = ['clausula_principal', 'clausula_relacionada', 'tipo_relacion']
    
    def __str__(self):
        return f"{self.clausula_principal.titulo} -> {self.clausula_relacionada.titulo} ({self.tipo_relacion})"


class Adenda(models.Model):
    """Addendum model for tracking changes to clauses"""
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('APLICADA', 'Aplicada'),
        ('APLICADA_PARCIALMENTE', 'Aplicada Parcialmente'),
        ('RECHAZADA', 'Rechazada'),
    ]
    
    clausula = models.ForeignKey(
        Clausula,
        on_delete=models.CASCADE,
        related_name='adendas'
    )
    contenido_anterior = models.TextField(verbose_name='Contenido anterior')
    contenido_nuevo = models.TextField(verbose_name='Contenido nuevo')
    motivo = models.TextField(verbose_name='Motivo')
    
    # Relation to file upload
    archivo = models.ForeignKey(
        'documentos.HistorialArchivo',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adendas',
        verbose_name='Archivo relacionado'
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    creada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    
    # Replace boolean with estado field
    estado = models.CharField(
        max_length=30,
        choices=ESTADO_CHOICES,
        default='PENDIENTE',
        verbose_name='Estado'
    )
    fecha_aplicacion = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'clausulas_adendas'
        ordering = ['-fecha_creacion']
        verbose_name = 'Adenda de Cláusula'
        verbose_name_plural = 'Adendas de Cláusulas'
    
    def __str__(self):
        return f"Adenda a {self.clausula.titulo}"
    
    @property
    def esta_aplicada(self):
        """Backward compatibility property"""
        return self.estado in ['APLICADA', 'APLICADA_PARCIALMENTE']
