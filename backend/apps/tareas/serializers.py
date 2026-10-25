from rest_framework import serializers
from django.utils import timezone

from apps.authentication.models import Usuario
from apps.common.fields import RichTextField
from .models import (
    Area,
    NivelRiesgo,
    TareaCumplimiento,
    ChecklistItem,
    ComentarioTarea,
    ArchivoRespaldo,
    HistorialEstadoTarea,
    Presentacion,
    CambioCampoTarea
)
from .transiciones import estados_disponibles


class NivelRiesgoSerializer(serializers.ModelSerializer):
    """Serializer for NivelRiesgo (Risk Level) model"""
    
    class Meta:
        model = NivelRiesgo
        fields = ['id', 'nombre', 'descripcion', 'activo', 'creado_en', 'actualizado_en']
        read_only_fields = ['id', 'creado_en', 'actualizado_en']


class AreaSerializer(serializers.ModelSerializer):
    """Serializer for Area (Department) model"""
    
    class Meta:
        model = Area
        fields = ['id', 'nombre', 'descripcion', 'activo', 'creado_en', 'actualizado_en']
        read_only_fields = ['id', 'creado_en', 'actualizado_en']
    
    def create(self, validated_data):
        """Create area"""
        return super().create(validated_data)


class ChecklistItemSerializer(serializers.ModelSerializer):
    """Serializer for checklist items"""
    
    class Meta:
        model = ChecklistItem
        fields = ['id', 'titulo', 'completado', 'orden', 'fecha_creacion', 'fecha_completacion']
        read_only_fields = ['id', 'fecha_creacion', 'fecha_completacion']


class ComentarioTareaSerializer(serializers.ModelSerializer):
    """Serializer for task comments"""
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)
    
    class Meta:
        model = ComentarioTarea
        fields = [
            'id', 'tarea', 'usuario', 'usuario_nombre', 'usuario_email',
            'texto', 'fecha_creacion', 'fecha_modificacion'
        ]
        read_only_fields = ['id', 'tarea', 'usuario', 'fecha_creacion', 'fecha_modificacion']
    
    def create(self, validated_data):
        validated_data['usuario'] = self.context['request'].user
        return super().create(validated_data)


class ArchivoRespaldoSerializer(serializers.ModelSerializer):
    """Serializer for backup files"""
    subido_por_nombre = serializers.CharField(source='subido_por.get_full_name', read_only=True)
    url = serializers.SerializerMethodField()
    es_video = serializers.ReadOnlyField()
    es_imagen = serializers.ReadOnlyField()
    
    # Tipos de archivo permitidos
    ALLOWED_MIME_TYPES = [
        # Documentos
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'text/markdown',
        # Imágenes
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
        'image/svg+xml',
        # Videos
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-ms-wmv',
        'video/webm',
        'video/x-matroska',
        'video/x-flv',
        # Archivos comprimidos
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/x-tar',
        'application/gzip',
        'application/octet-stream',  # Para archivos que no se detectan correctamente
    ]
    
    class Meta:
        model = ArchivoRespaldo
        fields = [
            'id', 'tarea', 'archivo', 'url', 'nombre_original', 'descripcion',
            'descripcion_grupo', 'tipo_mime', 'es_video', 'es_imagen',
            'subido_por', 'subido_por_nombre', 'fecha_subida', 'tamanio'
        ]
        read_only_fields = ['id', 'tarea', 'subido_por', 'fecha_subida', 'tamanio', 'nombre_original', 'tipo_mime']
    
    def get_url(self, obj):
        request = self.context.get('request')
        if obj.archivo and hasattr(obj.archivo, 'url'):
            if request:
                return request.build_absolute_uri(obj.archivo.url)
            return obj.archivo.url
        return None
    
    def validate_archivo(self, value):
        """Validate file type and size"""
        import mimetypes
        import os
        
        # Get MIME type
        mime_type = None
        if hasattr(value, 'content_type'):
            mime_type = value.content_type
        else:
            # Fallback to guessing from filename
            mime_type, _ = mimetypes.guess_type(value.name)
        
        # If MIME type is application/octet-stream, try to detect from extension
        if mime_type == 'application/octet-stream':
            _, ext = os.path.splitext(value.name.lower())
            if ext == '.md':
                mime_type = 'text/markdown'
            elif ext == '.txt':
                mime_type = 'text/plain'
            elif ext in ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf']:
                # These should be detected correctly, but just in case
                mime_type, _ = mimetypes.guess_type(value.name)
        
        # Validate MIME type
        if mime_type and mime_type not in self.ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(
                f'Tipo de archivo no permitido: {mime_type}. '
                'Los tipos permitidos incluyen documentos, imágenes, videos y archivos comprimidos.'
            )
        
        # Validate file size (max 100MB)
        max_size = 100 * 1024 * 1024  # 100MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f'El archivo es demasiado grande. Tamaño máximo: 100MB. Tamaño actual: {value.size / (1024*1024):.2f}MB'
            )
        
        return value
    
    def create(self, validated_data):
        import mimetypes
        
        validated_data['subido_por'] = self.context['request'].user
        archivo = validated_data.get('archivo')
        if archivo:
            validated_data['nombre_original'] = archivo.name
            validated_data['tamanio'] = archivo.size
            
            # Determine MIME type
            mime_type = None
            if hasattr(archivo, 'content_type'):
                mime_type = archivo.content_type
            else:
                mime_type, _ = mimetypes.guess_type(archivo.name)
            
            if mime_type:
                validated_data['tipo_mime'] = mime_type
        
        return super().create(validated_data)


class CambioCampoTareaSerializer(serializers.ModelSerializer):
    """Registro de correcciones al título o a la fecha de vencimiento."""
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    campo_display = serializers.CharField(source='get_campo_display', read_only=True)

    class Meta:
        model = CambioCampoTarea
        fields = [
            'id', 'tarea', 'campo', 'campo_display',
            'valor_anterior', 'valor_nuevo', 'motivo',
            'usuario', 'usuario_nombre', 'rol_usuario', 'fecha_cambio'
        ]
        # El registro es inmutable: se crea desde el endpoint y no se edita por API.
        read_only_fields = fields


class HistorialEstadoTareaSerializer(serializers.ModelSerializer):
    """Serializer for task state history"""
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    documento_url = serializers.SerializerMethodField()
    etapa_display = serializers.CharField(source='get_etapa_display', read_only=True)
    
    class Meta:
        model = HistorialEstadoTarea
        fields = [
            'id', 'tarea', 'etapa', 'etapa_display', 'estado_anterior', 'estado_nuevo',
            'usuario', 'usuario_nombre', 'rol_usuario', 'fecha_cambio',
            'observaciones', 'documento_adjunto', 'documento_url'
        ]
        read_only_fields = ['id', 'tarea', 'usuario', 'rol_usuario', 'fecha_cambio']
    
    def get_documento_url(self, obj):
        request = self.context.get('request')
        if obj.documento_adjunto and hasattr(obj.documento_adjunto, 'url'):
            if request:
                return request.build_absolute_uri(obj.documento_adjunto.url)
            return obj.documento_adjunto.url
        return None


class TareaCumplimientoSerializer(serializers.ModelSerializer):
    """Serializer for TareaCumplimiento model"""
    # La descripción de la obligación se edita con texto enriquecido.
    descripcion = RichTextField()
    creado_por_nombre = serializers.CharField(
        source='creado_por.get_full_name',
        read_only=True
    )
    clausula_titulo = serializers.CharField(
        source='clausula.titulo',
        read_only=True
    )
    area = serializers.PrimaryKeyRelatedField(
        queryset=Area.objects.none(),
        required=False,
        allow_null=True
    )
    area_nombre = serializers.CharField(
        source='area.nombre',
        read_only=True
    )
    responsables = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.none(),
        many=True,
        required=False,
        allow_empty=True
    )
    responsables_detalle = serializers.SerializerMethodField()
    niveles_riesgo = serializers.PrimaryKeyRelatedField(
        queryset=NivelRiesgo.objects.none(),
        many=True,
        required=False,
        allow_empty=True
    )
    niveles_riesgo_detalle = serializers.SerializerMethodField()
    esta_vencida = serializers.ReadOnlyField()
    dias_restantes = serializers.ReadOnlyField()
    checklist_items = ChecklistItemSerializer(many=True, read_only=True)
    comentarios = serializers.SerializerMethodField()
    archivos_respaldo = serializers.SerializerMethodField()
    progreso_checklist = serializers.SerializerMethodField()
    en_cumplimiento = serializers.SerializerMethodField()
    historial_estados = serializers.SerializerMethodField()
    cambios_campos = CambioCampoTareaSerializer(many=True, read_only=True)
    etapa_display = serializers.CharField(source='get_etapa_actual_display', read_only=True)
    prioridad_display = serializers.CharField(source='get_prioridad_display', read_only=True)
    impacto_display = serializers.CharField(source='get_impacto_display', read_only=True)
    probabilidad_display = serializers.CharField(source='get_probabilidad_display', read_only=True)
    estados_disponibles = serializers.SerializerMethodField()
    documento_autoridad_url = serializers.SerializerMethodField()
    
    # Add notification config field (read-only)
    notificacion_config = serializers.SerializerMethodField()
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            self.fields['area'].queryset = Area.objects.filter(activo=True)
            self.fields['responsables'].queryset = Usuario.objects.filter(is_active=True)
            self.fields['niveles_riesgo'].queryset = NivelRiesgo.objects.filter(activo=True)

    class Meta:
        model = TareaCumplimiento
        fields = [
            'id', 'titulo', 'descripcion', 'clausula', 'clausula_titulo',
            'prioridad', 'prioridad_display', 'impacto', 'impacto_display', 'probabilidad', 'probabilidad_display',
            'area', 'area_nombre', 'etapa_actual', 'etapa_display', 'estado_etapa', 'estados_disponibles',
            'fecha_remision_autoridad', 'numero_expediente_autoridad', 'documento_autoridad', 'documento_autoridad_url',
            'fecha_vencimiento', 'fecha_inicio',
            'fecha_completacion', 'responsables', 'responsables_detalle',
            'niveles_riesgo', 'niveles_riesgo_detalle',
            'creado_por', 'creado_por_nombre', 'fecha_creacion',
            'ultima_modificacion', 'notas', 'evidencia', 'tags',
            'esta_vencida', 'dias_restantes', 'checklist_items',
            'comentarios', 'archivos_respaldo', 'progreso_checklist', 'en_cumplimiento',
            'historial_estados', 'cambios_campos', 'notificacion_config'
        ]
        # `titulo` y `fecha_vencimiento` son de solo lectura acá A PROPÓSITO: se corrigen
        # únicamente por PATCH /api/tareas/<id>/editar/, que exige rol habilitado y deja
        # registro en CambioCampoTarea. Sin esto, cualquiera que vea la obligación podía
        # correr su propia fecha límite por el PATCH genérico, sin dejar rastro.
        read_only_fields = [
            'id', 'creado_por', 'fecha_creacion',
            'ultima_modificacion', 'fecha_completacion',
            'titulo', 'fecha_vencimiento'
        ]
    
    def get_notificacion_config(self, obj):
        """Get notification configuration for the task"""
        try:
            from apps.notificaciones.serializers import NotificacionConfiguracionSerializer
            if hasattr(obj, 'notificacion_config'):
                return NotificacionConfiguracionSerializer(obj.notificacion_config).data
            return None
        except Exception:
            return None

    def get_comentarios(self, obj):
        """Get unarchived comments"""
        items = obj.comentarios.filter(presentaciones__isnull=True).order_by('-fecha_creacion')
        return ComentarioTareaSerializer(items, many=True).data

    def get_archivos_respaldo(self, obj):
        """Get unarchived backup files"""
        items = obj.archivos_respaldo.filter(presentaciones__isnull=True).order_by('-fecha_subida')
        return ArchivoRespaldoSerializer(items, many=True, context=self.context).data

    def get_historial_estados(self, obj):
        """Get unarchived history"""
        items = obj.historial_estados.filter(presentaciones__isnull=True).order_by('-fecha_cambio')
        return HistorialEstadoTareaSerializer(items, many=True, context=self.context).data

    def get_responsables_detalle(self, obj):
        return [
            {
                'id': usuario.id,
                'nombre': usuario.get_full_name(),
                'email': usuario.email,
                'role': usuario.role
            }
            for usuario in obj.responsables.all()
        ]
    
    def get_niveles_riesgo_detalle(self, obj):
        return [
            {
                'id': nivel.id,
                'nombre': nivel.nombre,
                'descripcion': nivel.descripcion
            }
            for nivel in obj.niveles_riesgo.all()
        ]
    
    def get_progreso_checklist(self, obj):
        """Calculate checklist progress percentage"""
        items = obj.checklist_items.all()
        if not items.exists():
            return None
        total = items.count()
        completados = items.filter(completado=True).count()
        return {
            'total': total,
            'completados': completados,
            'porcentaje': round((completados / total) * 100, 1) if total > 0 else 0
        }
    
    def get_en_cumplimiento(self, obj):
        """Check if task is in compliance"""
        # Una tarea está en cumplimiento si:
        # 1. Está completada (estados finales)
        # 2. O está en progreso y no está vencida
        estados_completados = ['VALIDADA', 'APROBADO_AUTORIDAD']
        if obj.estado_etapa in estados_completados:
            return True
        if obj.estado_etapa in ['EN_PROGRESO', 'REVISION_GERENCIAL', 'REVISION_ANALISTA'] and not obj.esta_vencida:
            return True
        if obj.estado_etapa == 'PENDIENTE' and not obj.esta_vencida:
            return True
        return False
    
    def get_estados_disponibles(self, obj):
        """Estados a los que el usuario puede pasar la obligación (ver `tareas.transiciones`)."""
        request = self.context.get('request')
        return estados_disponibles(request.user if request else None, obj)

    def get_documento_autoridad_url(self, obj):
        """Get URL for Authority document"""
        request = self.context.get('request')
        if obj.documento_autoridad and hasattr(obj.documento_autoridad, 'url'):
            if request:
                return request.build_absolute_uri(obj.documento_autoridad.url)
            return obj.documento_autoridad.url
        return None
    
    def validate_responsables(self, value):
        """Validate that all responsables exist and are active"""
        if not value:
            return value
        
        # Verificar que todos los IDs de responsables sean válidos
        responsable_ids = [r.id for r in value]
        usuarios_existentes = Usuario.objects.filter(id__in=responsable_ids, is_active=True)
        
        if len(usuarios_existentes) != len(responsable_ids):
            ids_no_encontrados = set(responsable_ids) - set(u.id for u in usuarios_existentes)
            raise serializers.ValidationError(
                f"Los siguientes IDs de responsables no existen o no están activos: {', '.join(map(str, ids_no_encontrados))}"
            )
        
        return value
    
    def create(self, validated_data):
        """Create a new task"""
        request = self.context['request']
        responsables = validated_data.pop('responsables', [])
        niveles_riesgo = validated_data.pop('niveles_riesgo', [])
        area = validated_data.get('area')
        
        # El área es opcional solo para ANALISTA_COMPLIANCE y OFICIAL_COMPLIANCE
        user_role = request.user.role
        if area is None and user_role not in ['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE']:
            raise serializers.ValidationError({'area': 'El área es obligatoria para tu rol.'})

        validated_data['creado_por'] = request.user

        tarea = super().create(validated_data)
        if responsables:
            tarea.responsables.set(responsables)
        if niveles_riesgo:
            tarea.niveles_riesgo.set(niveles_riesgo)
        return tarea

    def update(self, instance, validated_data):
        responsables = validated_data.pop('responsables', None)
        niveles_riesgo = validated_data.pop('niveles_riesgo', None)
        area = validated_data.get('area')
        
        # El área es opcional solo para ANALISTA_COMPLIANCE y OFICIAL_COMPLIANCE
        request = self.context.get('request')
        if request and 'area' in validated_data and area is None:
            user_role = request.user.role
            if user_role not in ['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE']:
                raise serializers.ValidationError({'area': 'El área es obligatoria para tu rol.'})

        instance = super().update(instance, validated_data)
        if responsables is not None:
            instance.responsables.set(responsables)
        if niveles_riesgo is not None:
            instance.niveles_riesgo.set(niveles_riesgo)
        return instance


# DEPRECATED: Use TareaEstadoEtapaSerializer instead
# Old TareaEstadoSerializer removed as we now use stage-based states


class TareaEstadoEtapaSerializer(serializers.Serializer):
    """Serializer for updating task stage status"""
    estado_etapa = serializers.CharField(max_length=30)
    observaciones = serializers.CharField(required=False, allow_blank=True)
    documento_adjunto = serializers.FileField(required=False, allow_null=True)
    
    # Campos específicos para la remisión al Rectorado
    fecha_remision_autoridad = serializers.DateField(required=False, allow_null=True)
    numero_expediente_autoridad = serializers.CharField(required=False, allow_blank=True, max_length=100)
    
    def validate(self, data):
        """Validate state transition based on current stage and user role"""
        instance = self.context.get('instance')
        request = self.context.get('request')
        
        if not instance or not request:
            return data
        
        user = request.user
        etapa_actual = instance.etapa_actual
        nuevo_estado = data.get('estado_etapa')
        
        # Validar que el estado pertenece a la etapa actual
        estados_validos_map = {
            'INICIO': [e[0] for e in TareaCumplimiento.ESTADO_ETAPA_1_CHOICES],
            'REVISION_GERENCIAL': [e[0] for e in TareaCumplimiento.ESTADO_ETAPA_2_CHOICES],
            'CONTROL_ANALISTA': [e[0] for e in TareaCumplimiento.ESTADO_ETAPA_3_CHOICES],
            'CONTROL_OFICIAL': [e[0] for e in TareaCumplimiento.ESTADO_ETAPA_4_CHOICES],
        }
        
        estados_validos = estados_validos_map.get(etapa_actual, [])
        if nuevo_estado not in estados_validos:
            raise serializers.ValidationError({
                'estado_etapa': f'El estado {nuevo_estado} no es válido para la etapa {etapa_actual}'
            })
        
        # Validar permisos por rol
        permisos_etapa = {
            'INICIO': ['RESPONSABLE', 'GERENTE', 'OFICIAL_COMPLIANCE'],
            'REVISION_GERENCIAL': ['GERENTE', 'ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE'],
            'CONTROL_ANALISTA': ['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE'],
            'CONTROL_OFICIAL': ['OFICIAL_COMPLIANCE'],
        }
        
        roles_permitidos = permisos_etapa.get(etapa_actual, [])
        if user.role not in roles_permitidos:
            raise serializers.ValidationError({
                'estado_etapa': f'No tienes permisos para modificar tareas en la etapa {etapa_actual}'
            })
        
        return data
    
    def update(self, instance, validated_data):
        """Update task stage status and create history entry"""
        request = self.context.get('request')
        user = request.user if request else None
        
        estado_anterior = instance.estado_etapa
        nuevo_estado = validated_data.get('estado_etapa')
        observaciones = validated_data.get('observaciones', '')
        documento = validated_data.get('documento_adjunto')
        
        # Actualizar estado de la tarea
        instance.estado_etapa = nuevo_estado
        
        # Actualizar campos de la remisión al Rectorado si aplica
        if 'fecha_remision_autoridad' in validated_data:
            instance.fecha_remision_autoridad = validated_data['fecha_remision_autoridad']
        if 'numero_expediente_autoridad' in validated_data:
            instance.numero_expediente_autoridad = validated_data['numero_expediente_autoridad']
        if 'documento_adjunto' in validated_data:
            instance.documento_autoridad = documento
        
        instance.save()
        
        # Crear entrada en el historial
        HistorialEstadoTarea.objects.create(
            tarea=instance,
            etapa=instance.etapa_actual,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            usuario=user,
            rol_usuario=user.role if user else '',
            observaciones=observaciones,
            documento_adjunto=documento
        )
        
        return instance


class TareaAvanzarEtapaSerializer(serializers.Serializer):
    """Serializer for advancing task to next stage"""
    observaciones = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate that task can advance to next stage"""
        instance = self.context.get('instance')
        request = self.context.get('request')
        
        if not instance or not request:
            return data
        
        user = request.user
        etapa_actual = instance.etapa_actual
        
        # Mapeo de transiciones de etapa
        transiciones = {
            'INICIO': ('REVISION_GERENCIAL', ['RESPONSABLE', 'GERENTE', 'OFICIAL_COMPLIANCE']),
            'REVISION_GERENCIAL': ('CONTROL_ANALISTA', ['GERENTE', 'ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE']),
            'CONTROL_ANALISTA': ('CONTROL_OFICIAL', ['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE']),
            'CONTROL_OFICIAL': (None, []),  # No hay siguiente etapa
        }
        
        if etapa_actual not in transiciones:
            raise serializers.ValidationError('Etapa actual no válida')
        
        siguiente_etapa, roles_permitidos = transiciones[etapa_actual]
        
        if siguiente_etapa is None:
            raise serializers.ValidationError('La tarea ya está en la última etapa')
        
        if user.role not in roles_permitidos:
            raise serializers.ValidationError(f'No tenés permisos para avanzar desde la etapa {dict(TareaCumplimiento.ETAPA_CHOICES).get(etapa_actual, etapa_actual)}')
        
        # Validar que el estado actual permite avanzar
        estados_que_permiten_avance = {
            'INICIO': ['EN_PROGRESO', 'REQUIERE_ATENCION', 'PENDIENTE'],
            'REVISION_GERENCIAL': ['VALIDADO_GERENTE'],
            'CONTROL_ANALISTA': ['PENDIENTE_VALIDACION_OFICIAL', 'EN_PROGRESO_ANALISTA'],
            'CONTROL_OFICIAL': [],
        }
        
        estados_permitidos = estados_que_permiten_avance.get(etapa_actual, [])
        if instance.estado_etapa not in estados_permitidos:
            raise serializers.ValidationError(
                f'No se puede avanzar de etapa con el estado actual: {instance.estado_etapa}. Estados permitidos: {", ".join(estados_permitidos)}'
            )
        
        data['siguiente_etapa'] = siguiente_etapa
        return data
    
    def update(self, instance, validated_data):
        """Advance task to next stage"""
        request = self.context.get('request')
        user = request.user if request else None
        
        etapa_anterior = instance.etapa_actual
        siguiente_etapa = validated_data['siguiente_etapa']
        observaciones = validated_data.get('observaciones', '')
        
        # Mapeo de estado inicial por etapa
        estados_iniciales = {
            'REVISION_GERENCIAL': 'REVISION_GERENCIAL',
            'CONTROL_ANALISTA': 'REVISION_ANALISTA',
            'CONTROL_OFICIAL': 'PENDIENTE_VALIDACION',
        }
        
        estado_inicial = estados_iniciales.get(siguiente_etapa, 'PENDIENTE')
        
        # Actualizar etapa y estado
        estado_anterior = instance.estado_etapa
        instance.etapa_actual = siguiente_etapa
        instance.estado_etapa = estado_inicial
        instance.save()
        
        # Crear entrada en el historial
        HistorialEstadoTarea.objects.create(
            tarea=instance,
            etapa=siguiente_etapa,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_inicial,
            usuario=user,
            rol_usuario=user.role if user else '',
            observaciones=observaciones or f'Avance de {dict(TareaCumplimiento.ETAPA_CHOICES)[etapa_anterior]} a {dict(TareaCumplimiento.ETAPA_CHOICES)[siguiente_etapa]}'
        )
        
        return instance


class TareaCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating tasks"""
    # Alta de obligaciones, tanto individual como vía /tareas/crear-multiples/.
    descripcion = RichTextField()
    area = serializers.PrimaryKeyRelatedField(
        queryset=Area.objects.filter(activo=True),
        required=False,
        allow_null=True
    )
    responsables = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.filter(is_active=True),
        many=True,
        required=False,
        allow_empty=True
    )
    niveles_riesgo = serializers.PrimaryKeyRelatedField(
        queryset=NivelRiesgo.objects.filter(activo=True),
        many=True,
        required=False,
        allow_empty=True
    )
    
    # Add notification config field (write-only)
    notificacion_config = serializers.DictField(
        required=False,
        write_only=True,
        help_text='Configuración de notificaciones: {habilitada: bool, intervalos_dias: [int]}'
    )
    
    class Meta:
        model = TareaCumplimiento
        fields = [
            'titulo', 'descripcion', 'clausula', 'prioridad', 'impacto', 'probabilidad',
            'fecha_vencimiento', 'area', 'responsables', 'niveles_riesgo', 'notas', 'tags',
            'notificacion_config'
        ]
    
    def validate_responsables(self, value):
        """Validate that all responsables exist and are active"""
        # value ya son objetos Usuario convertidos por PrimaryKeyRelatedField
        # Solo necesitamos validar que sean válidos (ya lo hace el queryset)
        return value
    
    def validate(self, data):
        """Validate notification config requires fecha_vencimiento"""
        notif_config = data.get('notificacion_config')
        
        if notif_config and notif_config.get('habilitada', False):
            if not data.get('fecha_vencimiento'):
                raise serializers.ValidationError({
                    'fecha_vencimiento': 'La fecha de vencimiento es obligatoria cuando las notificaciones están habilitadas'
                })
        
        return data
    
    def create(self, validated_data):
        """Create a new task with creator and notification config"""
        from apps.notificaciones.models import NotificacionConfiguracion
        from apps.notificaciones.serializers import NotificacionConfiguracionSerializer
        
        request = self.context['request']
        responsables = validated_data.pop('responsables', [])
        niveles_riesgo = validated_data.pop('niveles_riesgo', [])
        notificacion_config_data = validated_data.pop('notificacion_config', None)
        area = validated_data.get('area')
        
        # El área es opcional solo para ANALISTA_COMPLIANCE y OFICIAL_COMPLIANCE
        user_role = request.user.role
        if area is None and user_role not in ['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE']:
            raise serializers.ValidationError({'area': 'El área es obligatoria para tu rol.'})

        validated_data['creado_por'] = request.user

        tarea = super().create(validated_data)
        if responsables:
            tarea.responsables.set(responsables)
        if niveles_riesgo:
            tarea.niveles_riesgo.set(niveles_riesgo)
        
        # Create notification configuration if provided
        if notificacion_config_data:
            # Validate intervalos_dias
            intervalos_dias = notificacion_config_data.get('intervalos_dias', [])
            habilitada = notificacion_config_data.get('habilitada', True)
            
            # Use the NotificacionConfiguracionSerializer to validate
            notif_serializer = NotificacionConfiguracionSerializer(
                data={
                    'intervalos_dias': intervalos_dias,
                    'habilitada': habilitada
                }
            )
            
            if notif_serializer.is_valid():
                NotificacionConfiguracion.objects.create(
                    tarea=tarea,
                    intervalos_dias=notif_serializer.validated_data['intervalos_dias'],
                    habilitada=notif_serializer.validated_data['habilitada']
                )
        
        # Return the created task with full serialization
        return TareaCumplimientoSerializer(tarea, context=self.context).instance



class TareaCambiarEtapaDirectoSerializer(serializers.Serializer):
    """Serializer for Oficial Compliance to change task stage directly"""
    etapa_destino = serializers.ChoiceField(
        choices=TareaCumplimiento.ETAPA_CHOICES,
        required=True
    )
    estado_destino = serializers.CharField(required=True)
    observaciones = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate that only Oficial Compliance can change stages directly"""
        request = self.context.get("request")
        
        if not request:
            raise serializers.ValidationError("Request context is required")
        
        user = request.user
        
        # Solo Oficial de Compliance puede cambiar etapas directamente
        if user.role != "OFICIAL_COMPLIANCE":
            raise serializers.ValidationError(
                "Solo el/la Administrador/a de Contrato puede cambiar directamente la etapa de una tarea"
            )
        
        # Validar que el estado destino sea válido para la etapa destino
        etapa_destino = data["etapa_destino"]
        estado_destino = data["estado_destino"]
        
        estados_validos_por_etapa = {
            "INICIO": [choice[0] for choice in TareaCumplimiento.ESTADO_ETAPA_1_CHOICES],
            "REVISION_GERENCIAL": [choice[0] for choice in TareaCumplimiento.ESTADO_ETAPA_2_CHOICES],
            "CONTROL_ANALISTA": [choice[0] for choice in TareaCumplimiento.ESTADO_ETAPA_3_CHOICES],
            "CONTROL_OFICIAL": [choice[0] for choice in TareaCumplimiento.ESTADO_ETAPA_4_CHOICES],
        }
        
        estados_validos = estados_validos_por_etapa.get(etapa_destino, [])
        
        if estado_destino not in estados_validos:
            raise serializers.ValidationError(
                f"El estado {estado_destino} no es válido para la etapa {etapa_destino}"
            )
        
        return data
    
    def update(self, instance, validated_data):
        """Change task stage and state directly"""
        request = self.context.get("request")
        user = request.user if request else None
        
        etapa_anterior = instance.etapa_actual
        estado_anterior = instance.estado_etapa
        
        etapa_destino = validated_data["etapa_destino"]
        estado_destino = validated_data["estado_destino"]
        observaciones = validated_data.get("observaciones", "")
        
        # Actualizar etapa y estado
        instance.etapa_actual = etapa_destino
        instance.estado_etapa = estado_destino
        instance.save()
        
        # Crear entrada en el historial
        HistorialEstadoTarea.objects.create(
            tarea=instance,
            etapa=etapa_destino,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_destino,
            usuario=user,
            rol_usuario=user.role if user else "",
            observaciones=observaciones or f"Cambio directo de etapa por el/la Administrador/a de Contrato"
        )
        
        return instance


class PresentacionSerializer(serializers.ModelSerializer):
    """Serializer for Presentacion with nested activities"""
    creado_por_nombre = serializers.CharField(source='creado_por.get_full_name', read_only=True)
    archivos = ArchivoRespaldoSerializer(many=True, read_only=True)
    comentarios = ComentarioTareaSerializer(many=True, read_only=True)
    historial_estados = HistorialEstadoTareaSerializer(many=True, read_only=True)
    total_actividades = serializers.SerializerMethodField()
    
    class Meta:
        model = Presentacion
        fields = [
            'id', 'tarea', 'nombre', 'descripcion', 'fecha_creacion',
            'creado_por', 'creado_por_nombre', 'archivos', 'comentarios',
            'historial_estados', 'total_actividades'
        ]
        read_only_fields = ['id', 'tarea', 'fecha_creacion', 'creado_por']
    
    def get_total_actividades(self, obj):
        """Get total count of all activities in this presentation"""
        return (
            obj.archivos.count() + 
            obj.comentarios.count() + 
            obj.historial_estados.count()
        )


class PresentacionCreateSerializer(serializers.Serializer):
    """Serializer for creating/archiving a new Presentacion"""
    nombre = serializers.CharField(max_length=200)
    descripcion = serializers.CharField(required=False, allow_blank=True)
    etapa_destino = serializers.ChoiceField(
        choices=TareaCumplimiento.ETAPA_CHOICES,
        required=False,
        default='INICIO',
        help_text='Etapa a la que regresará la tarea tras archivar. Por defecto: INICIO'
    )
    
    def validate(self, data):
        """Validate that user has permission to archive presentations"""
        request = self.context.get('request')
        
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError('Authentication required')
        
        # Solo OFICIAL_COMPLIANCE puede archivar presentaciones
        if request.user.role != 'OFICIAL_COMPLIANCE':
            raise serializers.ValidationError(
                'Solo el/la Administrador/a de Contrato puede archivar presentaciones'
            )
        
        return data
    
    def create(self, validated_data):
        """Create a new presentation with current unarchived activities"""
        request = self.context.get('request')
        tarea = self.context.get('tarea')
        
        if not tarea:
            raise serializers.ValidationError('Task context is required')
        
        # Crear la presentación
        presentacion = Presentacion.objects.create(
            tarea=tarea,
            nombre=validated_data['nombre'],
            descripcion=validated_data.get('descripcion', ''),
            creado_por=request.user
        )
        
        # Obtener actividades no archivadas (que no pertenecen a ninguna presentación)
        archivos = tarea.archivos_respaldo.filter(presentaciones__isnull=True)
        comentarios = tarea.comentarios.filter(presentaciones__isnull=True)
        historial = tarea.historial_estados.filter(presentaciones__isnull=True)
        
        # Vincular las actividades a la presentación
        presentacion.archivos.set(archivos)
        presentacion.comentarios.set(comentarios)
        presentacion.historial_estados.set(historial)
        
        # --- NUEVO: Actualizar etapa de la tarea ---
        etapa_destino = validated_data.get('etapa_destino', 'INICIO')
        
        # Determinar estado inicial según la etapa destino
        estados_iniciales = {
            'INICIO': 'PENDIENTE',
            'REVISION_GERENCIAL': 'REVISION_GERENCIAL',
            'CONTROL_ANALISTA': 'REVISION_ANALISTA',
            'CONTROL_OFICIAL': 'PENDIENTE_VALIDACION',
        }
        
        estado_destino = estados_iniciales.get(etapa_destino, 'PENDIENTE')
        
        # Guardar estado anterior para historial
        etapa_anterior = tarea.etapa_actual
        estado_anterior = tarea.estado_etapa
        
        # Actualizar tarea
        tarea.etapa_actual = etapa_destino
        tarea.estado_etapa = estado_destino
        tarea.save()
        
        # Crear entrada en historial sobre el cambio de etapa post-archivo
        HistorialEstadoTarea.objects.create(
            tarea=tarea,
            etapa=etapa_destino,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_destino,
            usuario=request.user,
            rol_usuario=request.user.role,
            observaciones=f"Obligación movida a {dict(TareaCumplimiento.ETAPA_CHOICES).get(etapa_destino, etapa_destino)} tras archivar la presentación '{presentacion.nombre}'"
        )
        
        return presentacion
