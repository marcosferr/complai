from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from apps.documentos.models import DocumentoLegal
from apps.tareas.models import TareaCumplimiento
from apps.auditorias.models import Auditoria
from apps.clausulas.models import Clausula


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def estadisticas_dashboard(request):
    """
    Obtener estadísticas del dashboard según el rol del usuario
    """
    user = request.user
    # Base para todas las estadísticas
    stats = {
        'rol': user.role,
        'nombre_completo': user.get_full_name() or user.email,
        'area': user.area.nombre if user.area else None,
    }
    
    # Estadísticas comunes para todos
    tareas_qs = TareaCumplimiento.objects.all()
    
    # Filtrar tareas según rol
    if user.role == 'RESPONSABLE':
        # Solo ve sus tareas en etapa INICIO
        tareas_qs = tareas_qs.filter(
            etapa_actual='INICIO',
            responsables=user
        )
        stats['tareas'] = {
            'total': tareas_qs.count(),
            'pendientes': tareas_qs.filter(estado_etapa='PENDIENTE').count(),
            'en_progreso': tareas_qs.filter(estado_etapa='EN_PROGRESO').count(),
            'requiere_atencion': tareas_qs.filter(estado_etapa='REQUIERE_ATENCION').count(),
            'observadas': tareas_qs.filter(estado_etapa='OBSERVADO_GERENTE').count(),
        }
        
        # Tareas próximas a vencer (próximos 7 días)
        fecha_limite = timezone.now().date() + timedelta(days=7)
        stats['tareas_proximas'] = tareas_qs.filter(
            fecha_vencimiento__lte=fecha_limite,
            fecha_vencimiento__gte=timezone.now().date()
        ).count()
        
        # Tareas vencidas
        stats['tareas_vencidas'] = tareas_qs.filter(
            fecha_vencimiento__lt=timezone.now().date(),
            estado_etapa__in=['PENDIENTE', 'EN_PROGRESO', 'REQUIERE_ATENCION']
        ).count()
        
    elif user.role == 'GERENTE':
        # Ve tareas de su área en INICIO y REVISION_GERENCIAL
        tareas_qs = tareas_qs.filter(
            area=user.area,
            etapa_actual__in=['INICIO', 'REVISION_GERENCIAL']
        )
        
        stats['tareas'] = {
            'total': tareas_qs.count(),
            'en_inicio': tareas_qs.filter(etapa_actual='INICIO').count(),
            'en_revision': tareas_qs.filter(etapa_actual='REVISION_GERENCIAL').count(),
            'requieren_validacion': tareas_qs.filter(estado_etapa='VALIDACION_GERENCIAL').count(),
            'con_observaciones': tareas_qs.filter(estado_etapa='OBSERVADO_ANALISTA').count(),
        }
        clausulas_area = Clausula.objects.filter(
            tareas__area=user.area
        ).distinct()
        
        docs_area = DocumentoLegal.objects.filter(
            clausulas__in=clausulas_area
        ).distinct()
        
        stats['documentos'] = {
            'total_area': docs_area.count(),
            'activos': docs_area.filter(estado='ACTIVO').count(),
        }
        
        # Usuarios del área
        stats['usuarios_area'] = user.area.usuarios.filter(is_active=True).count()
        
    elif user.role == 'ANALISTA_COMPLIANCE':
        # Ve todas las tareas excepto CONTROL_OFICIAL
        tareas_qs = tareas_qs.filter(
            etapa_actual__in=['INICIO', 'REVISION_GERENCIAL', 'CONTROL_ANALISTA']
        )
        
        stats['tareas'] = {
            'total': tareas_qs.count(),
            'para_revision': tareas_qs.filter(
                etapa_actual='REVISION_GERENCIAL',
                estado_etapa='REVISION_GERENCIAL'
            ).count(),
            'en_control': tareas_qs.filter(etapa_actual='CONTROL_ANALISTA').count(),
            'validadas': tareas_qs.filter(estado_etapa='VALIDADA_ANALISTA').count(),
            'observadas': tareas_qs.filter(estado_etapa='OBSERVADO_OFICIAL').count(),
        }
        
        # Documentos totales
        stats['documentos'] = {
            'total': DocumentoLegal.objects.all().count(),
            'activos': DocumentoLegal.objects.filter(estado='ACTIVO').count(),
        }
        
        # Auditorías
        stats['auditorias'] = {
            'total': Auditoria.objects.all().count(),
            'en_progreso': Auditoria.objects.filter(estado='EN_PROGRESO').count(),
        }
        
    elif user.role == 'OFICIAL_COMPLIANCE':
        # Ve todo
        stats['tareas'] = {
            'total': tareas_qs.count(),
            'en_inicio': tareas_qs.filter(etapa_actual='INICIO').count(),
            'en_revision_gerencial': tareas_qs.filter(etapa_actual='REVISION_GERENCIAL').count(),
            'en_control_analista': tareas_qs.filter(etapa_actual='CONTROL_ANALISTA').count(),
            'en_control_oficial': tareas_qs.filter(etapa_actual='CONTROL_OFICIAL').count(),
            'validadas': tareas_qs.filter(estado_etapa='VALIDADA').count(),
            'remitidas_autoridad': tareas_qs.filter(estado_etapa='REMITIDO_AUTORIDAD').count(),
            'aprobadas_autoridad': tareas_qs.filter(estado_etapa='APROBADO_AUTORIDAD').count(),
        }
        
        # Documentos
        docs = DocumentoLegal.objects.all()
        stats['documentos'] = {
            'total': docs.count(),
            'activos': docs.filter(estado='ACTIVO').count(),
            'en_revision': docs.filter(estado='EN_REVISION').count(),
            'archivados': docs.filter(estado='ARCHIVADO').count(),
        }
        stats['clausulas'] = {
            'total': Clausula.objects.all().count(),
        }
        
        # Auditorías
        auditorias = Auditoria.objects.all()
        stats['auditorias'] = {
            'total': auditorias.count(),
            'pendientes': auditorias.filter(estado='PENDIENTE').count(),
            'en_progreso': auditorias.filter(estado='EN_PROGRESO').count(),
            'completadas': auditorias.filter(estado='COMPLETADA').count(),
        }
        
        # Áreas y usuarios
        from apps.tareas.models import Area
        from apps.authentication.models import Usuario
        stats['areas'] = Area.objects.filter(activo=True).count()
        stats['usuarios'] = Usuario.objects.filter(is_active=True).count()
    
    # Actividad reciente (últimas 5 tareas modificadas)
    tareas_recientes_qs = tareas_qs.order_by('-ultima_modificacion')[:5]
    stats['actividad_reciente'] = []
    
    for tarea in tareas_recientes_qs:
        stats['actividad_reciente'].append({
            'id': tarea.id,
            'titulo': tarea.titulo,
            'etapa': tarea.get_etapa_actual_display(),
            'estado_etapa': tarea.estado_etapa,
            'fecha': tarea.ultima_modificacion.isoformat(),
        })
    
    # Próximos vencimientos (próximos 14 días)
    if user.role != 'RESPONSABLE':  # Responsable ya tiene su versión
        fecha_limite = timezone.now().date() + timedelta(days=14)
        tareas_proximas = tareas_qs.filter(
            fecha_vencimiento__lte=fecha_limite,
            fecha_vencimiento__gte=timezone.now().date()
        ).order_by('fecha_vencimiento')[:5]
        
        stats['proximos_vencimientos'] = []
        for tarea in tareas_proximas:
            dias_restantes = (tarea.fecha_vencimiento - timezone.now().date()).days
            stats['proximos_vencimientos'].append({
                'id': tarea.id,
                'titulo': tarea.titulo,
                'fecha_vencimiento': tarea.fecha_vencimiento.isoformat(),
                'dias_restantes': dias_restantes,
                'prioridad': tarea.prioridad,
                'area': tarea.area.nombre if tarea.area else None,
            })
    
    return Response(stats)
