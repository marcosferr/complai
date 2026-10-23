from rest_framework import serializers
from .models import DocumentoLegal
from apps.clausulas.models import Clausula


class DocumentoSerializer(serializers.ModelSerializer):
    filename = serializers.ReadOnlyField()
    file_size = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    documento_padre_info = serializers.SerializerMethodField()
    documentos_hijos_info = serializers.SerializerMethodField()
    documentos_auxiliares_info = serializers.SerializerMethodField()
    archivo = serializers.FileField(required=False)  # Make archivo optional for updates
    
    class Meta:
        model = DocumentoLegal
        fields = [
            'id', 'titulo', 'tipo', 'archivo', 'filename', 'file_size',
            'contenido_extraido', 'resumen_ia', 'fecha_vencimiento', 'estado',
            'creado_por', 'fecha_creacion', 'ultima_modificacion', 'version',
            'esta_activo', 'etiquetas', 'palabras_clave', 'posiciones_grafo', 'is_expired',
            'estado_procesamiento_ia', 'error_procesamiento', 'fecha_procesamiento',
            'documento_padre', 'documento_padre_info', 'documentos_hijos_info',
            'documentos_auxiliares', 'documentos_auxiliares_info',
            'es_adenda', 'estado_adenda', 'numero_adenda', 'fijado', 'fecha_fijado'
        ]
        read_only_fields = [
            'id', 'contenido_extraido', 'resumen_ia', 'creado_por',
            'fecha_creacion', 'ultima_modificacion', 'version',
            'estado_procesamiento_ia', 'error_procesamiento', 'fecha_procesamiento'
        ]
    
    def get_documento_padre_info(self, obj):
        """Get basic info about parent document"""
        if obj.documento_padre:
            return {
                'id': obj.documento_padre.id,
                'titulo': obj.documento_padre.titulo,
                'tipo': obj.documento_padre.tipo
            }
        return None
    
    def get_documentos_hijos_info(self, obj):
        """Get basic info about child documents"""
        return [
            {
                'id': doc.id,
                'titulo': doc.titulo,
                'tipo': doc.tipo,
                'es_adenda': doc.es_adenda,
                'estado_adenda': doc.estado_adenda,
                'numero_adenda': doc.numero_adenda,
                'fecha_creacion': doc.fecha_creacion.isoformat() if doc.fecha_creacion else None
            }
            for doc in obj.documentos_hijos.all()
        ]
    
    def get_documentos_auxiliares_info(self, obj):
        """Get basic info about auxiliary documents"""
        return [
            {
                'id': doc.id,
                'titulo': doc.titulo,
                'tipo': doc.tipo,
                'fecha_creacion': doc.fecha_creacion.isoformat() if doc.fecha_creacion else None
            }
            for doc in obj.documentos_auxiliares.all()
        ]


class DocumentoDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with all AI processing fields"""
    filename = serializers.ReadOnlyField()
    file_size = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    clausulas_count = serializers.SerializerMethodField()
    documento_padre_info = serializers.SerializerMethodField()
    documentos_hijos_info = serializers.SerializerMethodField()
    documentos_auxiliares_info = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentoLegal
        fields = [
            'id', 'titulo', 'tipo', 'archivo', 'filename', 'file_size',
            'contenido_extraido', 'transcripcion_editable', 'resumen_ia', 
            'fecha_vencimiento', 'estado', 'creado_por', 'fecha_creacion', 
            'ultima_modificacion', 'version', 'esta_activo', 'etiquetas', 
            'palabras_clave', 'posiciones_grafo', 'is_expired', 'estado_procesamiento_ia', 
            'error_procesamiento', 'clausulas_extraidas_ia', 'fecha_procesamiento',
            'clausulas_count', 'documento_padre', 'documento_padre_info', 'documentos_hijos_info',
            'documentos_auxiliares', 'documentos_auxiliares_info',
            'es_adenda', 'estado_adenda', 'numero_adenda', 'fijado', 'fecha_fijado'
        ]
        read_only_fields = [
            'id', 'contenido_extraido', 'resumen_ia', 'creado_por',
            'fecha_creacion', 'ultima_modificacion', 'version',
            'estado_procesamiento_ia', 'error_procesamiento', 'fecha_procesamiento',
            'clausulas_extraidas_ia'
        ]
    
    def get_clausulas_count(self, obj):
        """Get count of accepted clauses created from this document"""
        return obj.clausulas.count()
    
    def get_documento_padre_info(self, obj):
        """Get basic info about parent document"""
        if obj.documento_padre:
            return {
                'id': obj.documento_padre.id,
                'titulo': obj.documento_padre.titulo,
                'tipo': obj.documento_padre.tipo
            }
        return None
    
    def get_documentos_hijos_info(self, obj):
        """Get basic info about child documents"""
        return [
            {
                'id': doc.id,
                'titulo': doc.titulo,
                'tipo': doc.tipo,
                'es_adenda': doc.es_adenda,
                'estado_adenda': doc.estado_adenda,
                'numero_adenda': doc.numero_adenda,
                'fecha_creacion': doc.fecha_creacion.isoformat() if doc.fecha_creacion else None
            }
            for doc in obj.documentos_hijos.all()
        ]
    
    def get_documentos_auxiliares_info(self, obj):
        """Get basic info about auxiliary documents"""
        return [
            {
                'id': doc.id,
                'titulo': doc.titulo,
                'tipo': doc.tipo,
                'fecha_creacion': doc.fecha_creacion.isoformat() if doc.fecha_creacion else None
            }
            for doc in obj.documentos_auxiliares.all()
        ]


class TranscripcionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating the editable transcription"""
    class Meta:
        model = DocumentoLegal
        fields = ['transcripcion_editable']


class DocumentoUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoLegal
        fields = ['titulo', 'tipo', 'archivo', 'fecha_vencimiento', 'etiquetas']
        
    def create(self, validated_data):
        creado_por = self.context['request'].user
        
        return DocumentoLegal.objects.create(
            creado_por=creado_por,
            **validated_data
        )


class AdendaSerializer(serializers.ModelSerializer):
    """Serializer for Adenda model"""
    filename = serializers.ReadOnlyField()
    documento_base_info = serializers.SerializerMethodField()
    clausulas_afectadas = serializers.SerializerMethodField()
    
    class Meta:
        from .models import Adenda
        model = Adenda
        fields = [
            'id', 'documento_base', 'documento_base_info', 'numero', 'titulo', 
            'descripcion', 'archivo', 'filename', 'fecha_vigencia', 'fecha_creacion',
            'estado', 'creado_por', 'contenido_extraido', 'estado_procesamiento_ia',
            'clausulas_afectadas'
        ]
        read_only_fields = [
            'id', 'fecha_creacion', 'creado_por', 'contenido_extraido', 
            'estado_procesamiento_ia'
        ]
    
    def get_documento_base_info(self, obj):
        return {
            'id': obj.documento_base.id,
            'titulo': obj.documento_base.titulo,
            'tipo': obj.documento_base.tipo
        }
    
    def get_clausulas_afectadas(self, obj):
        """Get clauses affected by this addendum"""
        from .models import VersionClausula
        versiones = VersionClausula.objects.filter(adenda=obj).select_related('clausula')
        return [
            {
                'id': v.clausula.id,
                'titulo': v.clausula.titulo,
                'version': v.numero_version
            }
            for v in versiones
        ]


class VersionClausulaSerializer(serializers.ModelSerializer):
    """Serializer for VersionClausula model"""
    adenda_info = serializers.SerializerMethodField()
    clausula_titulo = serializers.CharField(source='clausula.titulo', read_only=True)
    
    class Meta:
        from .models import VersionClausula
        model = VersionClausula
        fields = [
            'id', 'clausula', 'clausula_titulo', 'adenda', 'adenda_info',
            'numero_version', 'contenido', 'observaciones', 'fecha_creacion',
            'activa', 'creado_por'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'creado_por']
    
    def get_adenda_info(self, obj):
        if obj.adenda:
            return {
                'id': obj.adenda.id,
                'numero': obj.adenda.numero,
                'titulo': obj.adenda.titulo,
                'fecha_vigencia': obj.adenda.fecha_vigencia
            }
        return None


class HistorialArchivoSerializer(serializers.ModelSerializer):
    """Serializer for HistorialArchivo model"""
    filename = serializers.ReadOnlyField()
    subido_por_nombre = serializers.CharField(source='subido_por.get_full_name', read_only=True)
    
    class Meta:
        from .models import HistorialArchivo
        model = HistorialArchivo
        fields = [
            'id', 'documento', 'archivo', 'filename', 'version_numero',
            'notas', 'fecha_subida', 'subido_por', 'subido_por_nombre',
            'tamano_archivo'
        ]
        read_only_fields = ['id', 'fecha_subida', 'subido_por', 'tamano_archivo']