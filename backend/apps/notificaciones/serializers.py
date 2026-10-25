from rest_framework import serializers
from .models import Notificacion, NotificacionConfiguracion
from apps.authentication.models import Usuario


class NotificacionSerializer(serializers.ModelSerializer):
    """Serializer for Notificacion model with complete task details"""
    
    usuario_nombre = serializers.SerializerMethodField()
    tarea_detalle = serializers.SerializerMethodField()
    
    class Meta:
        model = Notificacion
        fields = [
            'id',
            'tipo',
            'titulo',
            'mensaje',
            'tarea',
            'tarea_detalle',
            'leida',
            'fecha_creacion',
            'usuario',
            'usuario_nombre',
            'metadata',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'usuario']
    
    def get_usuario_nombre(self, obj):
        return obj.usuario.get_full_name() if obj.usuario else None
    
    def get_tarea_detalle(self, obj):
        """Return complete task details for the notification"""
        if not obj.tarea:
            return None
        
        tarea = obj.tarea
        
        # Calculate days remaining
        dias_restantes = None
        esta_vencida = False
        if tarea.fecha_vencimiento:
            from django.utils import timezone
            estados_completados = ['VALIDADA', 'APROBADO_RECTORADO']
            if tarea.estado_etapa not in estados_completados:
                delta = tarea.fecha_vencimiento - timezone.now().date()
                dias_restantes = delta.days
                esta_vencida = dias_restantes < 0
        
        # Get responsables names
        responsables_nombres = []
        if hasattr(tarea, 'responsables'):
            responsables_nombres = [
                r.get_full_name() or r.email 
                for r in tarea.responsables.all()
            ]
        
        return {
            'id': tarea.id,
            'titulo': tarea.titulo,
            'descripcion': tarea.descripcion,
            'prioridad': tarea.prioridad,
            'prioridad_display': tarea.get_prioridad_display(),
            'fecha_vencimiento': tarea.fecha_vencimiento.isoformat() if tarea.fecha_vencimiento else None,
            'fecha_inicio': tarea.fecha_inicio.isoformat() if tarea.fecha_inicio else None,
            'dias_restantes': dias_restantes,
            'esta_vencida': esta_vencida,
            'etapa_actual': tarea.etapa_actual,
            'etapa_actual_display': tarea.get_etapa_actual_display(),
            'estado_etapa': tarea.estado_etapa,
            'area': {
                'id': tarea.area.id,
                'nombre': tarea.area.nombre
            } if tarea.area else None,
            'responsables': responsables_nombres,
            'creado_por': tarea.creado_por.get_full_name() or tarea.creado_por.email if tarea.creado_por else None,
            'clausula': {
                'id': tarea.clausula.id,
                'titulo': tarea.clausula.titulo
            } if tarea.clausula else None,
        }


class NotificacionConfiguracionSerializer(serializers.ModelSerializer):
    """Serializer for NotificacionConfiguracion model"""
    
    proximas_notificaciones = serializers.SerializerMethodField()
    
    class Meta:
        model = NotificacionConfiguracion
        fields = [
            'id',
            'tarea',
            'intervalos_dias',
            'habilitada',
            'notificaciones_enviadas',
            'proximas_notificaciones',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'tarea', 'notificaciones_enviadas', 'created_at', 'updated_at']
    
    def validate_intervalos_dias(self, value):
        """Validate intervals are valid (0-365 days, no duplicates)"""
        if not isinstance(value, list):
            raise serializers.ValidationError("intervalos_dias debe ser una lista de números")
        
        # Validate each interval
        validated_intervals = []
        for intervalo in value:
            if not isinstance(intervalo, int):
                raise serializers.ValidationError(f"El intervalo '{intervalo}' debe ser un número entero")
            
            if intervalo < 0 or intervalo > 365:
                raise serializers.ValidationError(
                    f"El intervalo {intervalo} debe estar entre 0 y 365 días"
                )
            
            validated_intervals.append(intervalo)
        
        # Remove duplicates and sort
        unique_intervals = sorted(set(validated_intervals), reverse=True)
        
        return unique_intervals
    
    def get_proximas_notificaciones(self, obj):
        """Calculate upcoming notification dates based on intervals and task due date"""
        from datetime import timedelta
        from django.utils import timezone
        
        if not obj.tarea or not obj.tarea.fecha_vencimiento or not obj.habilitada:
            return []
        
        today = timezone.now().date()
        fecha_vencimiento = obj.tarea.fecha_vencimiento
        proximas = []
        
        for intervalo in obj.intervalos_dias:
            fecha_notificacion = fecha_vencimiento - timedelta(days=intervalo)
            
            # Only include future notifications or today's notifications
            if fecha_notificacion >= today:
                # Check if already sent
                enviada = str(intervalo) in obj.notificaciones_enviadas
                
                proximas.append({
                    'intervalo_dias': intervalo,
                    'fecha_envio': fecha_notificacion.isoformat(),
                    'enviada': enviada,
                    'fecha_enviada': obj.notificaciones_enviadas.get(str(intervalo))
                })
        
        return proximas
