from rest_framework import serializers

from apps.common.fields import RichTextField

from .models import Clausula, ClausulaRelacionada, Adenda


class ClausulaSerializer(serializers.ModelSerializer):
    """Serializer for Clausula model"""
    # El contenido se edita con texto enriquecido: se sanea antes de guardarse.
    contenido = RichTextField()
    creada_por_nombre = serializers.CharField(
        source='creada_por.get_full_name',
        read_only=True
    )
    documento_titulo = serializers.CharField(
        source='documento.titulo',
        read_only=True
    )
    total_tareas = serializers.SerializerMethodField()
    total_relaciones = serializers.SerializerMethodField()
    
    class Meta:
        model = Clausula
        fields = [
            'id', 'documento', 'documento_titulo', 'titulo', 'contenido',
            'numero_orden', 'etiquetas', 'fecha_creacion', 'creada_por',
            'creada_por_nombre', 'total_tareas', 'total_relaciones'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'creada_por']
    
    def get_total_tareas(self, obj):
        """Get total tasks associated with this clause"""
        return obj.tareas.count()
    
    def get_total_relaciones(self, obj):
        """Get total relationships for this clause"""
        return obj.relaciones_salientes.count() + obj.relaciones_entrantes.count()
    
    def create(self, validated_data):
        """Create a new clause"""
        validated_data['creada_por'] = self.context['request'].user
        return super().create(validated_data)


class ClausulaDetalleSerializer(ClausulaSerializer):
    """Detailed serializer for Clausula with relationships"""
    relaciones_salientes = serializers.SerializerMethodField()
    relaciones_entrantes = serializers.SerializerMethodField()
    tareas = serializers.SerializerMethodField()
    adendas = serializers.SerializerMethodField()
    
    class Meta(ClausulaSerializer.Meta):
        fields = ClausulaSerializer.Meta.fields + [
            'relaciones_salientes', 'relaciones_entrantes',
            'tareas', 'adendas'
        ]
    
    def get_relaciones_salientes(self, obj):
        """Get outgoing relationships"""
        relaciones = obj.relaciones_salientes.all()
        return ClausulaRelacionadaSerializer(relaciones, many=True).data
    
    def get_relaciones_entrantes(self, obj):
        """Get incoming relationships"""
        relaciones = obj.relaciones_entrantes.all()
        return ClausulaRelacionadaSerializer(relaciones, many=True).data
    
    def get_tareas(self, obj):
        """Get tasks associated with this clause"""
        from apps.tareas.serializers import TareaCumplimientoSerializer
        tareas = obj.tareas.all()
        return TareaCumplimientoSerializer(tareas, many=True).data
    
    def get_adendas(self, obj):
        """Get addendums for this clause"""
        adendas = obj.adendas.all()
        return AdendaSerializer(adendas, many=True).data


class ClausulaRelacionadaSerializer(serializers.ModelSerializer):
    """Serializer for ClausulaRelacionada model"""
    clausula_principal_titulo = serializers.CharField(
        source='clausula_principal.titulo',
        read_only=True
    )
    clausula_relacionada_titulo = serializers.CharField(
        source='clausula_relacionada.titulo',
        read_only=True
    )
    creada_por_nombre = serializers.CharField(
        source='creada_por.get_full_name',
        read_only=True
    )
    
    class Meta:
        model = ClausulaRelacionada
        fields = [
            'id', 'clausula_principal', 'clausula_principal_titulo',
            'clausula_relacionada', 'clausula_relacionada_titulo',
            'tipo_relacion', 'descripcion', 'fecha_creacion',
            'creada_por', 'creada_por_nombre'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'creada_por']
    
    def validate(self, data):
        """Validate that clauses are not the same"""
        if data['clausula_principal'] == data['clausula_relacionada']:
            raise serializers.ValidationError(
                "Una cláusula no puede estar relacionada consigo misma."
            )
        return data
    
    def create(self, validated_data):
        """Create a new clause relationship"""
        validated_data['creada_por'] = self.context['request'].user
        return super().create(validated_data)


class AdendaSerializer(serializers.ModelSerializer):
    """Serializer for Adenda model"""
    # Al aplicarse, `contenido_nuevo` pasa a ser el contenido de la cláusula
    # (ver views.aplicar_adenda), así que tiene que sanearse igual que aquél.
    contenido_nuevo = RichTextField()
    contenido_anterior = RichTextField()
    creada_por_nombre = serializers.CharField(
        source='creada_por.get_full_name',
        read_only=True
    )
    clausula_titulo = serializers.CharField(
        source='clausula.titulo',
        read_only=True
    )
    archivo_nombre = serializers.CharField(
        source='archivo.filename',
        read_only=True
    )
    archivo_url = serializers.CharField(
        source='archivo.archivo.url',
        read_only=True
    )
    
    class Meta:
        model = Adenda
        fields = [
            'id', 'clausula', 'clausula_titulo', 'contenido_anterior',
            'contenido_nuevo', 'motivo', 'archivo', 'archivo_nombre', 'archivo_url',
            'fecha_creacion', 'creada_por', 'creada_por_nombre', 
            'estado', 'esta_aplicada', 'fecha_aplicacion'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'creada_por', 'fecha_aplicacion', 'esta_aplicada']
    
    def __init__(self, *args, **kwargs):
        """Make fields optional for updates and contenido_anterior optional for creates"""
        super().__init__(*args, **kwargs)
        
        # contenido_anterior is always optional (calculated automatically if not provided)
        self.fields['contenido_anterior'].required = False
        
        # For updates (when instance exists), make other fields optional too
        if self.instance:
            self.fields['clausula'].required = False
            self.fields['contenido_nuevo'].required = False
            self.fields['motivo'].required = False
            self.fields['archivo'].required = False
            self.fields['estado'].required = False
    
    def create(self, validated_data):
        """Create a new addendum"""
        validated_data['creada_por'] = self.context['request'].user
        # Store current content as previous content if not provided
        if 'contenido_anterior' not in validated_data:
            clausula = validated_data['clausula']
            validated_data['contenido_anterior'] = clausula.contenido
        return super().create(validated_data)


class AplicarAdendaSerializer(serializers.Serializer):
    """Serializer for applying an addendum"""
    aplicar = serializers.BooleanField(required=True)
    
    def validate_aplicar(self, value):
        """Ensure we're only applying, not unapplying"""
        if not value:
            raise serializers.ValidationError(
                "Solo se puede aplicar una adenda, no desaplicarla."
            )
        return value
