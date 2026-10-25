from django.db import models
from django.conf import settings
from django.utils import timezone


class NivelRiesgo(models.Model):
    """Nivel de riesgo para tareas de cumplimiento."""
    nombre = models.CharField(max_length=100, unique=True, verbose_name='Nombre')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    activo = models.BooleanField(default=True, verbose_name='Activo')
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    actualizado_en = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        db_table = 'niveles_riesgo'
        verbose_name = 'Nivel de Riesgo'
        verbose_name_plural = 'Niveles de Riesgo'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Area(models.Model):
    """Área o departamento organizacional."""
    nombre = models.CharField(max_length=150, unique=True, verbose_name='Nombre')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    activo = models.BooleanField(default=True, verbose_name='Activo')
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    actualizado_en = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        db_table = 'areas_departamentos'
        verbose_name = 'Área'
        verbose_name_plural = 'Áreas'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class TareaCumplimiento(models.Model):
    """Compliance Task model"""
    # Etapas del flujo de compliance
    ETAPA_CHOICES = [
        ('INICIO', 'Inicio'),
        ('REVISION_DIRECCION', 'Revisión de la Dirección'),
        ('CONTROL_UOC', 'Control de la UOC'),
        ('CONTROL_ADMINISTRADOR', 'Control del Administrador'),
    ]

    # Estados por etapa - Etapa 1: Inicio (Responsable Técnico)
    ESTADO_ETAPA_1_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROGRESO', 'En Progreso'),
        ('REQUIERE_ATENCION', 'Requiere Atención'),
        ('OBSERVADO_DIRECCION', 'Devuelto con Observaciones de la Dirección'),
    ]

    # Estados por etapa - Etapa 2: Revisión de la Dirección (Director/a de la dependencia)
    ESTADO_ETAPA_2_CHOICES = [
        ('REVISION_DIRECCION', 'En Revisión de la Dirección'),
        ('VALIDADO_DIRECCION', 'Validado por la Dirección'),
        ('OBSERVADO_UOC', 'Con Observaciones de la UOC'),
    ]

    # Estados por etapa - Etapa 3: Control de la UOC
    ESTADO_ETAPA_3_CHOICES = [
        ('REVISION_UOC', 'En Revisión de la UOC'),
        ('EN_PROGRESO_UOC', 'En Progreso (UOC)'),
        ('OBSERVADO_ADMINISTRADOR', 'Devuelto con Observaciones del Administrador'),
        ('PENDIENTE_VALIDACION_ADMIN', 'Pendiente Validación del Administrador'),
    ]

    # Estados por etapa - Etapa 4: Control del Administrador/a de Contrato
    ESTADO_ETAPA_4_CHOICES = [
        ('PENDIENTE_VALIDACION', 'Pendiente Validación'),
        ('VALIDADA', 'Validada'),
        ('REMITIDO_RECTORADO', 'Remitido al Rectorado'),
        ('OBSERVADO_RECTORADO', 'Observado por el Rectorado'),
        ('APROBADO_RECTORADO', 'Aprobado por el Rectorado'),
        ('RECHAZADO_RECTORADO', 'Rechazado por el Rectorado'),
    ]

    PRIORIDAD_CHOICES = [
        ('BAJA', 'Baja'),
        ('MEDIA', 'Media'),
        ('ALTA', 'Alta'),
        ('CRITICA', 'Crítica'),
    ]

    IMPACTO_CHOICES = [
        ('BAJO', 'Bajo'),
        ('MEDIO', 'Medio'),
        ('ALTO', 'Alto'),
    ]

    PROBABILIDAD_CHOICES = [
        ('BAJA', 'Baja'),
        ('MEDIA', 'Media'),
        ('ALTA', 'Alta'),
    ]

    area = models.ForeignKey(
        'tareas.Area',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tareas',
        verbose_name='Área'
    )
    titulo = models.CharField(max_length=200, verbose_name='Título')
    descripcion = models.TextField(verbose_name='Descripción')
    clausula = models.ForeignKey(
        'clausulas.Clausula',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tareas',
        verbose_name='Cláusula'
    )
    
    # Sistema de estados por etapa
    etapa_actual = models.CharField(
        max_length=30,
        choices=ETAPA_CHOICES,
        default='INICIO',
        verbose_name='Etapa Actual'
    )
    estado_etapa = models.CharField(
        max_length=30,
        default='PENDIENTE',
        verbose_name='Estado en Etapa Actual',
        help_text='Estado específico dentro de la etapa actual'
    )
    
    # Campos específicos para la remisión al Rectorado (máxima autoridad)
    fecha_remision_rectorado = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha Remisión al Rectorado'
    )
    numero_expediente_rectorado = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Número de Expediente del Rectorado'
    )
    documento_rectorado = models.FileField(
        upload_to='tareas/rectorado/',
        null=True,
        blank=True,
        verbose_name='Documento del Rectorado',
        help_text='Documento oficial del Rectorado (aprobación, rechazo u observaciones)'
    )
    
    prioridad = models.CharField(
        max_length=10,
        choices=PRIORIDAD_CHOICES,
        default='MEDIA',
        verbose_name='Prioridad'
    )
    impacto = models.CharField(
        max_length=10,
        choices=IMPACTO_CHOICES,
        default='MEDIO',
        verbose_name='Impacto en el negocio'
    )
    probabilidad = models.CharField(
        max_length=10,
        choices=PROBABILIDAD_CHOICES,
        default='MEDIA',
        verbose_name='Probabilidad de ocurrencia'
    )
    fecha_vencimiento = models.DateField(verbose_name='Fecha de vencimiento')
    fecha_inicio = models.DateField(null=True, blank=True, verbose_name='Fecha de inicio')
    fecha_completacion = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de completación')
    responsables = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='tareas_asignadas',
        verbose_name='Responsables'
    )
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='tareas_creadas',
        verbose_name='Creado por'
    )
    niveles_riesgo = models.ManyToManyField(
        'tareas.NivelRiesgo',
        blank=True,
        related_name='tareas',
        verbose_name='Niveles de Riesgo'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    ultima_modificacion = models.DateTimeField(auto_now=True)
    
    # Metadata
    notas = models.TextField(blank=True, verbose_name='Notas')
    evidencia = models.FileField(
        upload_to='tareas/evidencias/',
        null=True,
        blank=True,
        verbose_name='Evidencia'
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Etiquetas',
        help_text='Lista de etiquetas para categorizar la tarea'
    )
    
    class Meta:
        db_table = 'tareas_cumplimiento'
        ordering = ['-fecha_vencimiento', '-prioridad']
        verbose_name = 'Tarea de cumplimiento'
        verbose_name_plural = 'Tareas de cumplimiento'
        indexes = [
            models.Index(fields=['etapa_actual']),
            models.Index(fields=['estado_etapa']),
            models.Index(fields=['area']),
            models.Index(fields=['fecha_vencimiento']),
            models.Index(fields=['clausula']),
        ]
    
    def __str__(self):
        return f"{self.titulo} ({self.etapa_actual} - {self.estado_etapa})"
    
    @property
    def esta_vencida(self):
        """Check if task is overdue"""
        # Task is not overdue if completed (APROBADO_RECTORADO or in final stages)
        estados_completados = ['VALIDADA', 'APROBADO_RECTORADO']
        if self.estado_etapa not in estados_completados:
            if self.fecha_vencimiento:
                return timezone.now().date() > self.fecha_vencimiento
        return False
    
    @property
    def dias_restantes(self):
        """Calculate days remaining until due date"""
        estados_completados = ['VALIDADA', 'APROBADO_RECTORADO']
        if self.estado_etapa not in estados_completados and self.fecha_vencimiento:
            delta = self.fecha_vencimiento - timezone.now().date()
            return delta.days
        return None
    
    def marcar_completa(self):
        """Mark task as completed"""
        self.estado_etapa = 'VALIDADA'
        self.etapa_actual = 'CONTROL_ADMINISTRADOR'
        self.fecha_completacion = timezone.now()
        self.save()
    
    def marcar_en_progreso(self):
        """Mark task as in progress"""
        self.estado_etapa = 'EN_PROGRESO'
        self.etapa_actual = 'INICIO'
        if not self.fecha_inicio:
            self.fecha_inicio = timezone.now().date()
        self.save()


class ChecklistItem(models.Model):
    """Checklist item for a compliance task"""
    tarea = models.ForeignKey(
        TareaCumplimiento,
        on_delete=models.CASCADE,
        related_name='checklist_items',
        verbose_name='Tarea'
    )
    titulo = models.CharField(max_length=200, verbose_name='Título')
    completado = models.BooleanField(default=False, verbose_name='Completado')
    orden = models.IntegerField(default=0, verbose_name='Orden')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_completacion = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de completación')
    
    class Meta:
        db_table = 'tareas_checklist_items'
        ordering = ['orden', 'id']
        verbose_name = 'Item de checklist'
        verbose_name_plural = 'Items de checklist'
    
    def __str__(self):
        return f"{self.titulo} - {'✓' if self.completado else '○'}"
    
    def marcar_completado(self):
        """Mark checklist item as completed"""
        self.completado = True
        self.fecha_completacion = timezone.now()
        self.save()


class ComentarioTarea(models.Model):
    """Comment on a compliance task"""
    tarea = models.ForeignKey(
        TareaCumplimiento,
        on_delete=models.CASCADE,
        related_name='comentarios',
        verbose_name='Tarea'
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comentarios_tareas',
        verbose_name='Usuario'
    )
    texto = models.TextField(verbose_name='Texto')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tareas_comentarios'
        ordering = ['-fecha_creacion']
        verbose_name = 'Comentario de tarea'
        verbose_name_plural = 'Comentarios de tareas'
    
    def __str__(self):
        return f"Comentario de {self.usuario.get_full_name()} en {self.tarea.titulo}"


class ArchivoRespaldo(models.Model):
    """Backup file for compliance proof"""
    tarea = models.ForeignKey(
        TareaCumplimiento,
        on_delete=models.CASCADE,
        related_name='archivos_respaldo',
        verbose_name='Tarea'
    )
    archivo = models.FileField(
        upload_to='tareas/respaldos/',
        verbose_name='Archivo'
    )
    nombre_original = models.CharField(max_length=255, verbose_name='Nombre original')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    descripcion_grupo = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Descripción de Grupo',
        help_text='Descripción compartida para agrupar múltiples archivos'
    )
    tipo_mime = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Tipo MIME',
        help_text='Tipo de archivo (ej: video/mp4, application/pdf)'
    )
    subido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='archivos_respaldo_subidos',
        verbose_name='Subido por'
    )
    fecha_subida = models.DateTimeField(auto_now_add=True)
    tamanio = models.IntegerField(verbose_name='Tamaño (bytes)', default=0)
    
    class Meta:
        db_table = 'tareas_archivos_respaldo'
        ordering = ['-fecha_subida']
        verbose_name = 'Archivo de respaldo'
        verbose_name_plural = 'Archivos de respaldo'
    
    def __str__(self):
        return f"{self.nombre_original} - {self.tarea.titulo}"
    
    @property
    def es_video(self):
        """Check if file is a video"""
        if self.tipo_mime:
            return self.tipo_mime.startswith('video/')
        # Fallback to extension check
        if self.nombre_original:
            ext = self.nombre_original.lower().split('.')[-1]
            return ext in ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']
        return False
    
    @property
    def es_imagen(self):
        """Check if file is an image"""
        if self.tipo_mime:
            return self.tipo_mime.startswith('image/')
        # Fallback to extension check
        if self.nombre_original:
            ext = self.nombre_original.lower().split('.')[-1]
            return ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
        return False


class HistorialEstadoTarea(models.Model):
    """Historial de transiciones de estado por etapa"""
    tarea = models.ForeignKey(
        TareaCumplimiento,
        on_delete=models.CASCADE,
        related_name='historial_estados',
        verbose_name='Tarea'
    )
    etapa = models.CharField(
        max_length=30,
        choices=TareaCumplimiento.ETAPA_CHOICES,
        verbose_name='Etapa'
    )
    estado_anterior = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Estado Anterior'
    )
    estado_nuevo = models.CharField(
        max_length=50,
        verbose_name='Estado Nuevo'
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='cambios_estado_tareas',
        verbose_name='Usuario que realizó el cambio'
    )
    rol_usuario = models.CharField(
        max_length=30,
        verbose_name='Rol del Usuario'
    )
    fecha_cambio = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha del Cambio'
    )
    observaciones = models.TextField(
        blank=True,
        verbose_name='Observaciones',
        help_text='Comentarios o razones del cambio de estado'
    )
    documento_adjunto = models.FileField(
        upload_to='tareas/historial/',
        null=True,
        blank=True,
        verbose_name='Documento Adjunto',
        help_text='Documento relacionado con la transición (ej: observaciones oficiales)'
    )
    
    class Meta:
        db_table = 'tareas_historial_estados'
        ordering = ['-fecha_cambio']
        verbose_name = 'Historial de Estado'
        verbose_name_plural = 'Historiales de Estado'
        indexes = [
            models.Index(fields=['tarea', 'fecha_cambio']),
            models.Index(fields=['etapa', 'estado_nuevo']),
        ]
    
    def __str__(self):
        return f"{self.tarea.titulo} - {self.estado_anterior} → {self.estado_nuevo} ({self.fecha_cambio.strftime('%Y-%m-%d %H:%M')})"


class Presentacion(models.Model):
    """Presentación archivada de actividades de una tarea"""
    tarea = models.ForeignKey(
        TareaCumplimiento,
        on_delete=models.CASCADE,
        related_name='presentaciones',
        verbose_name='Tarea'
    )
    nombre = models.CharField(
        max_length=200,
        verbose_name='Nombre',
        help_text='Nombre identificador de la presentación'
    )
    descripcion = models.TextField(
        blank=True,
        verbose_name='Descripción',
        help_text='Descripción opcional de la presentación'
    )
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='presentaciones_creadas',
        verbose_name='Creado por'
    )
    
    # Snapshot de actividades incluidas en esta presentación
    archivos = models.ManyToManyField(
        'ArchivoRespaldo',
        blank=True,
        related_name='presentaciones',
        verbose_name='Archivos incluidos'
    )
    comentarios = models.ManyToManyField(
        'ComentarioTarea',
        blank=True,
        related_name='presentaciones',
        verbose_name='Comentarios incluidos'
    )
    historial_estados = models.ManyToManyField(
        'HistorialEstadoTarea',
        blank=True,
        related_name='presentaciones',
        verbose_name='Historial de estados incluido'
    )
    
    class Meta:
        db_table = 'tareas_presentaciones'
        ordering = ['-fecha_creacion']
        verbose_name = 'Presentación'
        verbose_name_plural = 'Presentaciones'
        indexes = [
            models.Index(fields=['tarea', 'fecha_creacion']),
        ]
    
    def __str__(self):
        return f"{self.nombre} - {self.tarea.titulo} ({self.fecha_creacion.strftime('%Y-%m-%d')})"


class CambioCampoTarea(models.Model):
    """Registro inmutable de cambios a campos sensibles de una obligación.

    A diferencia de los comentarios y los archivos de respaldo, este registro NO tiene
    relación con `Presentacion`: el serializer filtra esos por `presentaciones__isnull=True`,
    así que archivar una presentación los saca del feed. Un rastro de auditoría que se puede
    hacer desaparecer archivando algo no sirve como auditoría.
    """
    CAMPO_CHOICES = [
        ('titulo', 'Título'),
        ('fecha_vencimiento', 'Fecha de Vencimiento'),
    ]

    tarea = models.ForeignKey(
        TareaCumplimiento,
        on_delete=models.CASCADE,
        related_name='cambios_campos',
        verbose_name='Obligación'
    )
    campo = models.CharField(
        max_length=40,
        choices=CAMPO_CHOICES,
        verbose_name='Campo modificado'
    )
    valor_anterior = models.TextField(
        blank=True,
        verbose_name='Valor anterior',
        help_text='Valor previo ya formateado como texto (las fechas en ISO)'
    )
    valor_nuevo = models.TextField(
        blank=True,
        verbose_name='Valor nuevo',
        help_text='Valor resultante ya formateado como texto (las fechas en ISO)'
    )
    motivo = models.TextField(
        blank=True,
        verbose_name='Motivo',
        help_text='Obligatorio al mover la fecha de vencimiento; opcional al corregir el título'
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='cambios_campos_tareas',
        verbose_name='Usuario que realizó el cambio'
    )
    rol_usuario = models.CharField(
        max_length=30,
        verbose_name='Rol del Usuario'
    )
    fecha_cambio = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha del Cambio'
    )

    class Meta:
        db_table = 'tareas_cambios_campos'
        ordering = ['-fecha_cambio']
        verbose_name = 'Cambio de campo'
        verbose_name_plural = 'Cambios de campos'
        indexes = [
            models.Index(fields=['tarea', 'fecha_cambio']),
        ]

    def __str__(self):
        return f"{self.tarea.titulo} - {self.get_campo_display()}: {self.valor_anterior} → {self.valor_nuevo}"
