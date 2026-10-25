from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from datetime import timedelta
from django.utils import timezone

from .models import Notificacion, NotificacionConfiguracion
from .serializers import NotificacionSerializer, NotificacionConfiguracionSerializer


class NotificacionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for notifications - read only with custom actions"""
    
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return only notifications for the current user with optimized queries"""
        queryset = Notificacion.objects.filter(
            usuario=self.request.user
        ).select_related(
            'tarea',
            'tarea__area',
            'tarea__creado_por',
            'tarea__clausula'
        ).prefetch_related(
            'tarea__responsables'
        ).order_by('-fecha_creacion')

        leida_param = self.request.query_params.get('leida')
        if leida_param is not None:
            leida_str = str(leida_param).lower()
            if leida_str in ['true', '1', 't', 'yes', 'y']:  # allow common truthy strings
                queryset = queryset.filter(leida=True)
            elif leida_str in ['false', '0', 'f', 'no', 'n']:
                queryset = queryset.filter(leida=False)

        return queryset
    
    @action(detail=True, methods=['post'])
    def marcar_leida(self, request, pk=None):
        """Mark a single notification as read"""
        notificacion = self.get_object()
        notificacion.marcar_leida()
        serializer = self.get_serializer(notificacion)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def marcar_todas_leidas(self, request):
        """Mark all notifications as read for the current user"""
        count = Notificacion.objects.filter(
            usuario=request.user,
            leida=False
        ).update(leida=True)
        
        return Response({
            'message': f'{count} notificaciones marcadas como leídas',
            'count': count
        })
    
    @action(detail=False, methods=['get'])
    def no_leidas(self, request):
        """Get count of unread notifications"""
        count = Notificacion.objects.filter(
            usuario=request.user,
            leida=False
        ).count()
        
        return Response({
            'count': count
        })


class NotificacionConfiguracionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification configurations"""
    
    serializer_class = NotificacionConfiguracionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'put', 'patch']  # Only allow retrieve and update
    
    def get_queryset(self):
        """Return notification configs based on user permissions"""
        user = self.request.user
        
        # Oficiales and Analistas can see all configs
        if user.role in ['ADMINISTRADOR_CONTRATO', 'ANALISTA_UOC']:
            return NotificacionConfiguracion.objects.all().select_related('tarea')
        
        # Gerentes can see configs from their area
        if user.role == 'DIRECTOR' and user.area:
            return NotificacionConfiguracion.objects.filter(
                tarea__area=user.area
            ).select_related('tarea')
        
        # Responsables can see configs of their assigned tasks
        return NotificacionConfiguracion.objects.filter(
            tarea__responsables=user
        ).select_related('tarea')
    
    def retrieve(self, request, pk=None):
        """Get notification config by tarea_id"""
        try:
            # pk is actually tarea_id
            config = self.get_queryset().get(tarea_id=pk)
            serializer = self.get_serializer(config)
            return Response(serializer.data)
        except NotificacionConfiguracion.DoesNotExist:
            return Response(
                {'detail': 'Configuración de notificaciones no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def update(self, request, pk=None):
        """Update notification config by tarea_id"""
        try:
            # pk is actually tarea_id
            config = self.get_queryset().get(tarea_id=pk)
            serializer = self.get_serializer(config, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except NotificacionConfiguracion.DoesNotExist:
            return Response(
                {'detail': 'Configuración de notificaciones no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Preview upcoming notification dates for a task"""
        try:
            # pk is actually tarea_id
            config = self.get_queryset().get(tarea_id=pk)
            
            if not config.tarea.fecha_vencimiento or not config.habilitada:
                return Response({
                    'proximas_notificaciones': [],
                    'mensaje': 'No hay notificaciones programadas'
                })
            
            today = timezone.now().date()
            fecha_vencimiento = config.tarea.fecha_vencimiento
            proximas = []
            
            for intervalo in config.intervalos_dias:
                fecha_notificacion = fecha_vencimiento - timedelta(days=intervalo)
                
                enviada = str(intervalo) in config.notificaciones_enviadas
                fecha_enviada = config.notificaciones_enviadas.get(str(intervalo))
                
                # Include all notifications (past and future)
                proximas.append({
                    'intervalo_dias': intervalo,
                    'fecha_envio': fecha_notificacion.isoformat(),
                    'enviada': enviada,
                    'fecha_enviada': fecha_enviada,
                    'es_pasada': fecha_notificacion < today,
                    'es_hoy': fecha_notificacion == today,
                    'dias_hasta_envio': (fecha_notificacion - today).days
                })
            
            return Response({
                'tarea_id': config.tarea.id,
                'tarea_titulo': config.tarea.titulo,
                'fecha_vencimiento': fecha_vencimiento.isoformat(),
                'proximas_notificaciones': proximas,
                'habilitada': config.habilitada
            })
            
        except NotificacionConfiguracion.DoesNotExist:
            return Response(
                {'detail': 'Configuración de notificaciones no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
