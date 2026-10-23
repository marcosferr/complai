from rest_framework import serializers
from .models import Auditoria, DocumentoAuditoria, ArchivoAuditoria
from apps.documentos.serializers import DocumentoDetailSerializer


class DocumentoAuditoriaSerializer(serializers.ModelSerializer):
    documento_detalle = DocumentoDetailSerializer(source='documento', read_only=True)
    
    class Meta:
        model = DocumentoAuditoria
        fields = [
            'id', 'auditoria', 'documento', 'documento_detalle',
            'fecha_asignacion', 'notas'
        ]
        read_only_fields = ['id', 'fecha_asignacion']


class ArchivoAuditoriaSerializer(serializers.ModelSerializer):
    subido_por_nombre = serializers.CharField(source='subido_por.get_full_name', read_only=True)
    
    class Meta:
        model = ArchivoAuditoria
        fields = [
            'id', 'auditoria', 'tipo', 'archivo', 'nombre_archivo',
            'descripcion', 'subido_por', 'subido_por_nombre', 'fecha_subida'
        ]
        read_only_fields = ['id', 'subido_por', 'fecha_subida']


class AuditoriaListSerializer(serializers.ModelSerializer):
    """Serializer for listing audits (minimal data)"""
    responsable_nombre = serializers.CharField(source='responsable.get_full_name', read_only=True)
    cantidad_documentos = serializers.SerializerMethodField()
    
    class Meta:
        model = Auditoria
        fields = [
            'id', 'titulo', 'descripcion', 'fecha_programada', 'fecha_inicio',
            'fecha_finalizacion', 'estado', 'responsable', 'responsable_nombre',
            'cantidad_documentos', 'fecha_creacion', 'ultima_modificacion'
        ]
    
    def get_cantidad_documentos(self, obj):
        return obj.documentos.count()


class AuditoriaDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed audit view"""
    responsable_nombre = serializers.CharField(source='responsable.get_full_name', read_only=True)
    creado_por_nombre = serializers.CharField(source='creado_por.get_full_name', read_only=True)
    equipo_nombres = serializers.SerializerMethodField()
    documentos = DocumentoAuditoriaSerializer(many=True, read_only=True)
    archivos = ArchivoAuditoriaSerializer(many=True, read_only=True)
    
    class Meta:
        model = Auditoria
        fields = [
            'id', 'titulo', 'descripcion', 'fecha_programada', 'fecha_inicio',
            'fecha_finalizacion', 'estado', 'responsable', 'responsable_nombre',
            'equipo', 'equipo_nombres', 'hallazgos', 'recomendaciones', 'conclusion',
            'creado_por', 'creado_por_nombre', 'fecha_creacion', 'ultima_modificacion',
            'documentos', 'archivos'
        ]
        read_only_fields = ['id', 'creado_por', 'fecha_creacion', 'ultima_modificacion']
    
    def get_equipo_nombres(self, obj):
        return [usuario.get_full_name() for usuario in obj.equipo.all()]


class AuditoriaCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating audits"""
    
    class Meta:
        model = Auditoria
        fields = [
            'id', 'titulo', 'descripcion', 'fecha_programada', 'fecha_inicio',
            'fecha_finalizacion', 'estado', 'responsable', 'equipo',
            'hallazgos', 'recomendaciones', 'conclusion'
        ]
        read_only_fields = ['id']
    
    def validate(self, data):
        # Validate date logic
        if data.get('fecha_inicio') and data.get('fecha_finalizacion'):
            if data['fecha_inicio'] > data['fecha_finalizacion']:
                raise serializers.ValidationError(
                    "La fecha de inicio no puede ser posterior a la fecha de finalización"
                )
        
        if data.get('fecha_inicio') and data.get('fecha_programada'):
            if data['fecha_inicio'] < data['fecha_programada']:
                raise serializers.ValidationError(
                    "La fecha de inicio no puede ser anterior a la fecha programada"
                )
        
        return data
