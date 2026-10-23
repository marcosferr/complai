from rest_framework import generics, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date

from apps.authentication.models import Usuario
from .models import Area, NivelRiesgo, TareaCumplimiento, ChecklistItem, ComentarioTarea, ArchivoRespaldo, HistorialEstadoTarea, Presentacion, CambioCampoTarea
from .serializers import (
    AreaSerializer,
    NivelRiesgoSerializer,
    TareaCumplimientoSerializer,
    TareaEstadoEtapaSerializer,
    TareaAvanzarEtapaSerializer,
    TareaCreateSerializer,
    ChecklistItemSerializer,
    ComentarioTareaSerializer,
    ArchivoRespaldoSerializer,
    HistorialEstadoTareaSerializer,
    TareaCambiarEtapaDirectoSerializer,
    PresentacionSerializer,
    PresentacionCreateSerializer
)
from .permissions import CanDeleteTarea, PuedeEditarObligacion
from .transiciones import ETAPA_DE_ESTADO, motivo_de_rechazo


class TareaListCreateView(generics.ListCreateAPIView):
    """List all tasks or create a new task"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TareaCreateSerializer
        return TareaCumplimientoSerializer
    
    def get_queryset(self):
        """Filter tasks by various parameters"""
        user = self.request.user
        queryset = TareaCumplimiento.objects.filter(
            
        ).select_related('clausula', 'area', 'creado_por').prefetch_related('responsables', 'historial_estados', 'cambios_campos')

        # Role-based visibility por etapa
        if user.role == 'RESPONSABLE':
            # Responsable ve tareas donde está asignado en etapas INICIO y REVISION_GERENCIAL
            # Solo puede modificar las de INICIO
            queryset = queryset.filter(
                responsables=user,
                etapa_actual__in=['INICIO', 'REVISION_GERENCIAL']
            )
        elif user.role == 'GERENTE':
            # Gerente ve tareas de su área en etapas INICIO y REVISION_GERENCIAL
            queryset = queryset.filter(
                area=user.area,
                etapa_actual__in=['INICIO', 'REVISION_GERENCIAL']
            )
        elif user.role == 'ANALISTA_COMPLIANCE':
            # Analista ve todas las etapas excepto CONTROL_OFICIAL
            queryset = queryset.filter(
                etapa_actual__in=['INICIO', 'REVISION_GERENCIAL', 'CONTROL_ANALISTA']
            )
        elif user.role == 'OFICIAL_COMPLIANCE':
            # Oficial ve todas las tareas, pero puede filtrar por etapa
            pass  # Sin filtro - ve todo
        
        # Filter by etapa
        etapa = self.request.query_params.get('etapa')
        if etapa:
            queryset = queryset.filter(etapa_actual=etapa)
        
        # Filter by estado_etapa
        estado_etapa = self.request.query_params.get('estado_etapa')
        if estado_etapa:
            queryset = queryset.filter(estado_etapa=estado_etapa)
        
        # Filter by responsable
        responsable = self.request.query_params.get('responsable')
        if responsable:
            queryset = queryset.filter(responsables__id=responsable)
        
        # Filter by clausula
        clausula = self.request.query_params.get('clausula')
        if clausula:
            queryset = queryset.filter(clausula_id=clausula)
        
        # Filter by prioridad
        prioridad = self.request.query_params.get('prioridad')
        if prioridad:
            queryset = queryset.filter(prioridad=prioridad)

        # Filter by area
        area_id = self.request.query_params.get('area')
        if area_id:
            queryset = queryset.filter(area_id=area_id)
        
        # Filter by tags
        tag = self.request.query_params.get('tag')
        if tag:
            queryset = queryset.filter(tags__contains=[tag])
        
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tarea = serializer.save()
        output_serializer = TareaCumplimientoSerializer(tarea, context={'request': request})
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class TareaDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a task"""
    permission_classes = [IsAuthenticated, CanDeleteTarea]
    serializer_class = TareaCumplimientoSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = TareaCumplimiento.objects.filter(
            
        ).select_related('clausula', 'area', 'creado_por').prefetch_related('responsables', 'historial_estados', 'cambios_campos')

        # Role-based visibility por etapa
        if user.role == 'RESPONSABLE':
            queryset = queryset.filter(
                responsables=user,
                etapa_actual__in=['INICIO', 'REVISION_GERENCIAL']
            )
        elif user.role == 'GERENTE':
            queryset = queryset.filter(
                area=user.area,
                etapa_actual__in=['INICIO', 'REVISION_GERENCIAL']
            )
        elif user.role == 'ANALISTA_COMPLIANCE':
            queryset = queryset.filter(
                etapa_actual__in=['INICIO', 'REVISION_GERENCIAL', 'CONTROL_ANALISTA']
            )
        # OFICIAL_COMPLIANCE ve todo

        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tareas_por_clausula(request, clausula_id):
    """Get all tasks for a specific clause"""
    user = request.user
    tareas = TareaCumplimiento.objects.filter(
        clausula_id=clausula_id
    ).select_related('clausula', 'area', 'creado_por').prefetch_related('responsables', 'cambios_campos')

    if user.role == 'GERENTE':
        tareas = tareas.filter(area=user.area)
    elif user.role == 'RESPONSABLE':
        tareas = tareas.filter(responsables=user)
    
    serializer = TareaCumplimientoSerializer(tareas, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mis_tareas(request):
    """Get tasks assigned to current user"""
    user = request.user
    tareas = TareaCumplimiento.objects.filter(
        responsables=user
    ).select_related('clausula', 'creado_por', 'area').prefetch_related('responsables', 'cambios_campos')
    
    # Filter by etapa if provided
    etapa = request.query_params.get('etapa')
    if etapa:
        tareas = tareas.filter(etapa_actual=etapa)
    
    # Filter by estado_etapa if provided
    estado_etapa = request.query_params.get('estado_etapa')
    if estado_etapa:
        tareas = tareas.filter(estado_etapa=estado_etapa)
    
    serializer = TareaCumplimientoSerializer(tareas, many=True, context={'request': request})
    return Response(serializer.data)


# Checklist endpoints
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agregar_checklist_item(request, tarea_id):
    """Add a checklist item to a task"""
    user = request.user
    tarea = get_object_or_404(
        TareaCumplimiento,
        pk=tarea_id
    )
    
    serializer = ChecklistItemSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(tarea=tarea)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def actualizar_checklist_item(request, tarea_id, item_id):
    """Update a checklist item"""
    user = request.user
    item = get_object_or_404(
        ChecklistItem,
        pk=item_id,
        tarea_id=tarea_id
    )
    
    serializer = ChecklistItemSerializer(item, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_checklist_item(request, tarea_id, item_id):
    """Delete a checklist item"""
    user = request.user
    item = get_object_or_404(
        ChecklistItem,
        pk=item_id,
        tarea_id=tarea_id
    )
    item.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marcar_checklist_item(request, tarea_id, item_id):
    """Toggle checklist item completion"""
    user = request.user
    item = get_object_or_404(
        ChecklistItem,
        pk=item_id,
        tarea_id=tarea_id
    )
    
    if item.completado:
        item.completado = False
        item.fecha_completacion = None
    else:
        item.marcar_completado()
    
    item.save()
    serializer = ChecklistItemSerializer(item)
    return Response(serializer.data)


# Comentarios endpoints
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def comentarios_tarea(request, tarea_id):
    """Get or create comments for a task"""
    user = request.user
    tarea = get_object_or_404(
        TareaCumplimiento,
        pk=tarea_id
    )
    
    if request.method == 'GET':
        comentarios = ComentarioTarea.objects.filter(tarea=tarea, presentaciones__isnull=True)
        serializer = ComentarioTareaSerializer(comentarios, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = ComentarioTareaSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(tarea=tarea)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def comentario_detalle(request, tarea_id, comentario_id):
    """Update or delete a comment"""
    user = request.user
    comentario = get_object_or_404(
        ComentarioTarea,
        pk=comentario_id,
        tarea_id=tarea_id,
        usuario=user  # Only owner can edit/delete
    )
    
    if request.method == 'PUT':
        serializer = ComentarioTareaSerializer(
            comentario,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        comentario.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Archivos de respaldo endpoints
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def archivos_respaldo_tarea(request, tarea_id):
    """Get or upload backup files for a task"""
    user = request.user
    tarea = get_object_or_404(
        TareaCumplimiento,
        pk=tarea_id
    )
    
    if request.method == 'GET':
        archivos = ArchivoRespaldo.objects.filter(tarea=tarea, presentaciones__isnull=True)
        serializer = ArchivoRespaldoSerializer(
            archivos,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Support for multiple file uploads
        archivos_subidos = request.FILES.getlist('archivos')
        descripcion_individual = request.data.get('descripcion', '')
        descripcion_grupo = request.data.get('descripcion_grupo', '')
        
        if not archivos_subidos:
            # Fallback to single file upload
            archivos_subidos = [request.FILES.get('archivo')]
            if not archivos_subidos[0]:
                return Response(
                    {'error': 'No se proporcionaron archivos'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        archivos_creados = []
        errores = []
        
        for archivo in archivos_subidos:
            if not archivo:
                continue
                
            data = {
                'archivo': archivo,
                'descripcion': descripcion_individual,
                'descripcion_grupo': descripcion_grupo,
            }
            
            serializer = ArchivoRespaldoSerializer(
                data=data,
                context={'request': request}
            )
            
            try:
                if serializer.is_valid(raise_exception=True):
                    archivo_obj = serializer.save(tarea=tarea)
                    archivos_creados.append(
                        ArchivoRespaldoSerializer(archivo_obj, context={'request': request}).data
                    )
            except serializers.ValidationError as e:
                errores.append({
                    'archivo': archivo.name,
                    'error': str(e.detail)
                })
        
        if archivos_creados:
            response_data = {
                'archivos': archivos_creados,
                'total': len(archivos_creados)
            }
            if errores:
                response_data['errores'] = errores
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'error': 'No se pudieron subir los archivos', 'detalles': errores},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_archivo_respaldo(request, tarea_id, archivo_id):
    """Delete a backup file"""
    user = request.user
    archivo = get_object_or_404(
        ArchivoRespaldo,
        pk=archivo_id,
        tarea_id=tarea_id
    )
    
    # Delete the physical file
    if archivo.archivo:
        archivo.archivo.delete()
    
    archivo.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def actualizar_responsable(request, tarea_id):
    """Update task assignee"""
    user = request.user
    tarea = get_object_or_404(
        TareaCumplimiento,
        pk=tarea_id
    )

    if user.role not in {'OFICIAL_COMPLIANCE', 'GERENTE'}:
        return Response({'error': 'No tienes permisos para asignar responsables.'}, status=status.HTTP_403_FORBIDDEN)
    if user.role == 'GERENTE' and tarea.area != user.area:
        return Response({'error': 'No tienes permisos para asignar responsables.'}, status=status.HTTP_403_FORBIDDEN)

    responsables_ids = request.data.get('responsables', [])
    if not isinstance(responsables_ids, list):
        return Response({'error': 'Se requiere una lista de responsables.'}, status=status.HTTP_400_BAD_REQUEST)

    responsables_qs = Usuario.objects.filter(id__in=responsables_ids, is_active=True)
    if responsables_qs.count() != len(responsables_ids):
        return Response({'error': 'Uno o más responsables no existen o no pertenecen a tu organización.'}, status=status.HTTP_400_BAD_REQUEST)

    tarea.responsables.set(responsables_qs)
    tarea.save()
    serializer = TareaCumplimientoSerializer(tarea, context={'request': request})
    return Response({
        'message': 'Responsables actualizados exitosamente.',
        'tarea': serializer.data
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def actualizar_area_tarea(request, tarea_id):
    """Update task area"""
    user = request.user
    tarea = get_object_or_404(TareaCumplimiento, pk=tarea_id)

    # Verificar permisos
    if user.role not in {'ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE'}:
        return Response(
            {'error': 'No tienes permisos para modificar el área.'},
            status=status.HTTP_403_FORBIDDEN
        )

    area_id = request.data.get('area')
    
    # El área es opcional para ANALISTA y OFICIAL
    if area_id:
        try:
            area = Area.objects.get(id=area_id, activo=True)
            tarea.area = area
        except Area.DoesNotExist:
            return Response(
                {'error': 'El área especificada no existe.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        tarea.area = None
    
    tarea.save()
    serializer = TareaCumplimientoSerializer(tarea, context={'request': request})
    return Response({
        'message': 'Área actualizada exitosamente.',
        'tarea': serializer.data
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, PuedeEditarObligacion])
def editar_obligacion(request, pk):
    """Corrige el título y/o la fecha de vencimiento dejando registro del cambio.

    Es el ÚNICO camino para tocar esos dos campos: en `TareaCumplimientoSerializer` están
    marcados de solo lectura, así que el PATCH genérico ya no los acepta.
    """
    user = request.user
    tarea = get_object_or_404(TareaCumplimiento, pk=pk)

    titulo_entrante = request.data.get('titulo')
    fecha_entrante = request.data.get('fecha_vencimiento')
    motivo = (request.data.get('motivo') or '').strip()

    if titulo_entrante is None and fecha_entrante is None:
        return Response(
            {'error': 'Indicá al menos el título o la fecha de vencimiento.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # (campo, valor_anterior, valor_nuevo) ya como texto, listo para el registro
    cambios = []
    titulo_nuevo = None
    fecha_nueva = None

    if titulo_entrante is not None:
        titulo_nuevo = str(titulo_entrante).strip()
        if not titulo_nuevo:
            return Response(
                {'titulo': 'El título no puede quedar vacío.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(titulo_nuevo) > 200:
            return Response(
                {'titulo': 'El título no puede superar los 200 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if titulo_nuevo != tarea.titulo:
            cambios.append(('titulo', tarea.titulo, titulo_nuevo))

    if fecha_entrante is not None:
        fecha_nueva = parse_date(str(fecha_entrante))
        if fecha_nueva is None:
            return Response(
                {'fecha_vencimiento': 'Formato de fecha inválido; se espera AAAA-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Se admiten fechas pasadas a propósito: sirven para corregir carga histórica.
        if fecha_nueva != tarea.fecha_vencimiento:
            cambios.append((
                'fecha_vencimiento',
                tarea.fecha_vencimiento.isoformat() if tarea.fecha_vencimiento else '',
                fecha_nueva.isoformat()
            ))

    # Mandar el mismo valor que ya tiene no es un cambio: no se registra nada.
    if not cambios:
        return Response({
            'message': 'No hubo cambios para registrar.',
            'tarea': TareaCumplimientoSerializer(tarea, context={'request': request}).data
        })

    movio_la_fecha = any(campo == 'fecha_vencimiento' for campo, _, _ in cambios)
    if movio_la_fecha and not motivo:
        return Response(
            {'motivo': 'Indicá el motivo del cambio de fecha de vencimiento.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    with transaction.atomic():
        for campo, _, _ in cambios:
            if campo == 'titulo':
                tarea.titulo = titulo_nuevo
            else:
                tarea.fecha_vencimiento = fecha_nueva

        # save() y NO queryset.update(): la señal post_save de notificaciones reprograma
        # los avisos "faltan N días" contra la fecha nueva. Un update() se la saltea.
        tarea.save()

        for campo, anterior, nuevo in cambios:
            CambioCampoTarea.objects.create(
                tarea=tarea,
                campo=campo,
                valor_anterior=anterior,
                valor_nuevo=nuevo,
                motivo=motivo,
                usuario=user,
                rol_usuario=user.role
            )

    tarea.refresh_from_db()
    return Response({
        'message': 'Obligación actualizada exitosamente.',
        'tarea': TareaCumplimientoSerializer(tarea, context={'request': request}).data
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def actualizar_tags_tarea(request, tarea_id):
    """Update task tags"""
    user = request.user
    tarea = get_object_or_404(TareaCumplimiento, pk=tarea_id)

    # Verificar permisos
    if user.role not in {'ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE'}:
        return Response(
            {'error': 'No tienes permisos para modificar las etiquetas.'},
            status=status.HTTP_403_FORBIDDEN
        )

    tags = request.data.get('tags', [])
    if not isinstance(tags, list):
        return Response(
            {'error': 'Se requiere una lista de etiquetas.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    tarea.tags = tags
    tarea.save()
    serializer = TareaCumplimientoSerializer(tarea, context={'request': request})
    return Response({
        'message': 'Etiquetas actualizadas exitosamente.',
        'tarea': serializer.data
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def listar_areas(request):
    """List available areas for current tenant or create a new one"""
    user = request.user
    
    if request.method == 'POST':
        # Only admins and managers can create areas
        if user.role not in ['OFICIAL_COMPLIANCE', 'GERENTE']:
            return Response(
                {'error': 'No tienes permisos para crear áreas'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = AreaSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            area = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # GET method
    areas = Area.objects.filter(activo=True).order_by('nombre')
    serializer = AreaSerializer(areas, many=True)
    return Response(serializer.data)


# Nuevos endpoints para estados por etapa

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def cambiar_estado_etapa(request, pk):
    """Cambia el estado de una obligación (el Oficial puede además cambiarla de etapa)."""
    user = request.user
    tarea = get_object_or_404(
        TareaCumplimiento,
        pk=pk
    )
    
    nuevo_estado = request.data.get('estado_etapa')
    if not nuevo_estado:
        return Response(
            {'error': 'El campo estado_etapa es requerido'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Las reglas viven en tareas.transiciones: son las mismas que arman
    # `estados_disponibles`, con lo que el selector del detalle y el tablero muestran.
    rechazo = motivo_de_rechazo(user, tarea, nuevo_estado)
    if rechazo:
        mensaje_error, codigo_http = rechazo
        return Response({'error': mensaje_error}, status=codigo_http)

    nueva_etapa = ETAPA_DE_ESTADO[nuevo_estado]

    # Guardar estado anterior para historial
    etapa_anterior = tarea.etapa_actual
    estado_anterior = tarea.estado_etapa
    
    observaciones = request.data.get('observaciones', '')
    documento_adjunto = request.FILES.get('documento_adjunto')

    # El cambio y su renglón de historial van juntos. Quién lo hizo sale de la sesión
    # (request.user), nunca de un texto que mande el cliente.
    with transaction.atomic():
        tarea.etapa_actual = nueva_etapa
        tarea.estado_etapa = nuevo_estado
        tarea.save()

        HistorialEstadoTarea.objects.create(
            tarea=tarea,
            etapa=nueva_etapa,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            usuario=user,
            rol_usuario=user.role,
            observaciones=observaciones,
            documento_adjunto=documento_adjunto
        )
    
    mensaje = f'Estado actualizado exitosamente'
    if etapa_anterior != nueva_etapa:
        mensaje = f'Tarea movida de {etapa_anterior} a {nueva_etapa}'
    
    tarea.refresh_from_db()
    return Response(
        {
            'message': mensaje,
            'tarea': TareaCumplimientoSerializer(tarea, context={'request': request}).data
        },
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def avanzar_etapa(request, pk):
    """Advance task to next stage"""
    user = request.user
    tarea = get_object_or_404(
        TareaCumplimiento,
        pk=pk
    )
    
    # Log para debugging
    print(f"[DEBUG] avanzar_etapa - User: {user.email}, Role: {user.role}")
    print(f"[DEBUG] avanzar_etapa - Tarea ID: {tarea.id}, Etapa: {tarea.etapa_actual}, Estado: {tarea.estado_etapa}")
    
    serializer = TareaAvanzarEtapaSerializer(
        data=request.data,
        context={'instance': tarea, 'request': request}
    )
    
    if serializer.is_valid():
        serializer.update(tarea, serializer.validated_data)
        tarea.refresh_from_db()
        return Response(
            {
                'message': f'Tarea avanzada a etapa {tarea.etapa_actual}',
                'tarea': TareaCumplimientoSerializer(tarea, context={'request': request}).data
            },
            status=status.HTTP_200_OK
        )
    
    print(f"[DEBUG] avanzar_etapa - Errores de validación: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def devolver_con_observaciones(request, pk):
    """Return task to previous stage with observations"""
    user = request.user
    tarea = get_object_or_404(
        TareaCumplimiento,
        pk=pk
    )
    
    # Solo ciertos roles pueden devolver tareas
    if user.role not in ['GERENTE', 'ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE']:
        return Response(
            {'error': 'No tienes permisos para devolver tareas'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    observaciones = request.data.get('observaciones', '')
    if not observaciones:
        return Response(
            {'error': 'Las observaciones son obligatorias'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    etapa_anterior = tarea.etapa_actual
    estado_anterior = tarea.estado_etapa
    
    # Lógica de devolución según el rol y etapa actual
    puede_devolver = False
    
    if user.role == 'GERENTE':
        if tarea.etapa_actual == 'REVISION_GERENCIAL':
            # Gerente devuelve a INICIO con estado OBSERVADO_GERENTE
            tarea.etapa_actual = 'INICIO'
            tarea.estado_etapa = 'OBSERVADO_GERENTE'
            puede_devolver = True
    
    elif user.role == 'ANALISTA_COMPLIANCE':
        if tarea.etapa_actual == 'CONTROL_ANALISTA':
            # Analista devuelve a REVISION_GERENCIAL con estado OBSERVADO_ANALISTA
            tarea.etapa_actual = 'REVISION_GERENCIAL'
            tarea.estado_etapa = 'OBSERVADO_ANALISTA'
            puede_devolver = True
    
    elif user.role == 'OFICIAL_COMPLIANCE':
        # Oficial puede devolver desde cualquier etapa
        if tarea.etapa_actual == 'CONTROL_OFICIAL':
            # Oficial devuelve a CONTROL_ANALISTA con estado OBSERVADO_OFICIAL
            tarea.etapa_actual = 'CONTROL_ANALISTA'
            tarea.estado_etapa = 'OBSERVADO_OFICIAL'
            puede_devolver = True
        elif tarea.etapa_actual == 'CONTROL_ANALISTA':
            # Oficial devuelve a REVISION_GERENCIAL
            tarea.etapa_actual = 'REVISION_GERENCIAL'
            tarea.estado_etapa = 'OBSERVADO_ANALISTA'
            puede_devolver = True
        elif tarea.etapa_actual == 'REVISION_GERENCIAL':
            # Oficial devuelve a INICIO
            tarea.etapa_actual = 'INICIO'
            tarea.estado_etapa = 'OBSERVADO_GERENTE'
            puede_devolver = True
    
    if not puede_devolver:
        return Response(
            {'error': f'No se puede devolver desde la etapa {etapa_anterior} con el rol {user.role}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    tarea.save()
    
    # Registrar en historial
    HistorialEstadoTarea.objects.create(
        tarea=tarea,
        etapa=tarea.etapa_actual,
        estado_anterior=estado_anterior,
        estado_nuevo=tarea.estado_etapa,
        usuario=user,
        rol_usuario=user.role,
        observaciones=observaciones,
        documento_adjunto=request.FILES.get('documento_adjunto')
    )
    
    return Response(
        {
            'message': f'Tarea devuelta a etapa {tarea.etapa_actual} con observaciones',
            'tarea': TareaCumplimientoSerializer(tarea, context={'request': request}).data
        },
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def registrar_remision_autoridad(request, pk):
    """Register Authority submission"""
    user = request.user
    tarea = get_object_or_404(
        TareaCumplimiento,
        pk=pk
    )
    
    if user.role != 'OFICIAL_COMPLIANCE':
        return Response(
            {'error': 'Solo el Oficial de Compliance puede registrar remisiones a la Autoridad'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if tarea.etapa_actual != 'CONTROL_OFICIAL':
        return Response(
            {'error': 'La tarea debe estar en etapa de Control Oficial'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    fecha_remision = request.data.get('fecha_remision_autoridad')
    numero_expediente = request.data.get('numero_expediente_autoridad', '')
    
    if not fecha_remision:
        return Response(
            {'error': 'La fecha de remisión es obligatoria'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Actualizar tarea
    tarea.estado_etapa = 'REMITIDO_AUTORIDAD'
    tarea.fecha_remision_autoridad = fecha_remision
    tarea.numero_expediente_autoridad = numero_expediente
    
    if 'documento_autoridad' in request.FILES:
        tarea.documento_autoridad = request.FILES['documento_autoridad']
    
    tarea.save()
    
    # Registrar en historial
    HistorialEstadoTarea.objects.create(
        tarea=tarea,
        etapa=tarea.etapa_actual,
        estado_anterior='VALIDADA',
        estado_nuevo='REMITIDO_AUTORIDAD',
        usuario=user,
        rol_usuario=user.role,
        observaciones=f'Remitido a la Autoridad. Expediente: {numero_expediente}',
        documento_adjunto=request.FILES.get('documento_autoridad')
    )
    
    return Response(
        {
            'message': 'Remisión a la Autoridad registrada exitosamente',
            'tarea': TareaCumplimientoSerializer(tarea, context={'request': request}).data
        },
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def historial_estados(request, pk):
    """Get task state history"""
    user = request.user
    tarea = get_object_or_404(
        TareaCumplimiento,
        pk=pk
    )
    
    historial = HistorialEstadoTarea.objects.filter(tarea=tarea, presentaciones__isnull=True).order_by('-fecha_cambio')
    serializer = HistorialEstadoTareaSerializer(historial, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def estadisticas_por_etapa(request):
    """Get task statistics by stage"""
    user = request.user
    
    # Base queryset según rol
    queryset = TareaCumplimiento.objects.filter()
    
    if user.role == 'RESPONSABLE':
        queryset = queryset.filter(etapa_actual='INICIO', responsables=user)
    elif user.role == 'GERENTE':
        queryset = queryset.filter(area=user.area, etapa_actual__in=['INICIO', 'REVISION_GERENCIAL'])
    elif user.role == 'ANALISTA_COMPLIANCE':
        queryset = queryset.filter(etapa_actual__in=['INICIO', 'REVISION_GERENCIAL', 'CONTROL_ANALISTA'])
    
    # OFICIAL_COMPLIANCE ve todo
    
    # Estadísticas por etapa
    from django.db.models import Count, Q
    
    stats = {
        'por_etapa': {},
        'por_estado_etapa': {},
        'total': queryset.count()
    }
    
    # Contar por etapa
    for etapa_code, etapa_name in TareaCumplimiento.ETAPA_CHOICES:
        count = queryset.filter(etapa_actual=etapa_code).count()
        stats['por_etapa'][etapa_code] = {
            'nombre': etapa_name,
            'cantidad': count
        }
    
    # Contar por estado dentro de cada etapa
    etapa_param = request.query_params.get('etapa')
    if etapa_param:
        estados_etapa = queryset.filter(etapa_actual=etapa_param).values('estado_etapa').annotate(
            cantidad=Count('id')
        )
        stats['por_estado_etapa'] = {
            item['estado_etapa']: item['cantidad']
            for item in estados_etapa
        }
    
    return Response(stats)



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cambiar_etapa_directo(request, pk):
    """Permite al Oficial de Compliance cambiar directamente la etapa de una tarea"""
    user = request.user
    
    # Solo Oficial de Compliance puede usar este endpoint
    if user.role != "OFICIAL_COMPLIANCE":
        return Response(
            {"error": "Solo el Oficial de Compliance puede cambiar directamente las etapas"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    tarea = get_object_or_404(
        TareaCumplimiento,
        pk=pk
    )
    
    serializer = TareaCambiarEtapaDirectoSerializer(
        data=request.data,
        context={"instance": tarea, "request": request}
    )
    
    if serializer.is_valid():
        serializer.update(tarea, serializer.validated_data)
        tarea.refresh_from_db()
        return Response(
            {
                "message": f"Tarea movida a etapa {tarea.get_etapa_actual_display()} con estado {tarea.estado_etapa}",
                "tarea": TareaCumplimientoSerializer(tarea, context={"request": request}).data
            },
            status=status.HTTP_200_OK
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def obtener_tags(request):
    """Get all unique tags from all tasks"""
    from django.db.models import JSONField
    from django.contrib.postgres.aggregates import ArrayAgg
    
    # Obtener todas las tareas con tags
    tareas = TareaCumplimiento.objects.exclude(tags=[]).values_list('tags', flat=True)
    
    # Extraer todos los tags únicos
    all_tags = set()
    for tags_list in tareas:
        if tags_list:
            all_tags.update(tags_list)
    
    # Devolver lista ordenada
    return Response(sorted(list(all_tags)))


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def niveles_riesgo(request):
    """List or create risk levels"""
    if request.method == 'GET':
        niveles = NivelRiesgo.objects.filter(activo=True).order_by('nombre')
        serializer = NivelRiesgoSerializer(niveles, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Only admins and compliance officials can create risk levels
        if request.user.role not in ['OFICIAL_COMPLIANCE', 'ANALISTA_COMPLIANCE']:
            return Response(
                {'error': 'No tienes permisos para crear niveles de riesgo'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = NivelRiesgoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def nivel_riesgo_detalle(request, pk):
    """Retrieve, update or delete a risk level"""
    nivel = get_object_or_404(NivelRiesgo, pk=pk)
    
    if request.method == 'GET':
        serializer = NivelRiesgoSerializer(nivel)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Only admins and compliance officials can update risk levels
        if request.user.role not in ['OFICIAL_COMPLIANCE', 'ANALISTA_COMPLIANCE']:
            return Response(
                {'error': 'No tienes permisos para actualizar niveles de riesgo'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = NivelRiesgoSerializer(nivel, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Only admins and compliance officials can delete risk levels
        if request.user.role not in ['OFICIAL_COMPLIANCE']:
            return Response(
                {'error': 'No tienes permisos para eliminar niveles de riesgo'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Soft delete
        nivel.activo = False
        nivel.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_tareas_multiples(request):
    """
    Create multiple tasks at once for a clause.
    Expects a list of task data in request.data['tareas']
    """
    tareas_data = request.data.get('tareas', [])
    
    if not tareas_data:
        return Response(
            {'error': 'Se requiere una lista de tareas en el campo "tareas"'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not isinstance(tareas_data, list):
        return Response(
            {'error': 'El campo "tareas" debe ser una lista'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    created_tareas = []
    errors = []
    
    # Process each task
    for index, tarea_data in enumerate(tareas_data):
        serializer = TareaCreateSerializer(data=tarea_data, context={'request': request})
        
        if serializer.is_valid():
            try:
                tarea = serializer.save()
                # Use full serializer for response
                output_serializer = TareaCumplimientoSerializer(tarea, context={'request': request})
                created_tareas.append(output_serializer.data)
            except Exception as e:
                errors.append({
                    'index': index,
                    'error': str(e),
                    'data': tarea_data
                })
        else:
            errors.append({
                'index': index,
                'errors': serializer.errors,
                'data': tarea_data
            })
    
    response_data = {
        'created': created_tareas,
        'created_count': len(created_tareas),
        'errors': errors,
        'error_count': len(errors)
    }
    
    # If all failed, return 400
    if not created_tareas:
        return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
    
    # If some succeeded, return 201 with partial success info
    response_status = status.HTTP_201_CREATED if not errors else status.HTTP_207_MULTI_STATUS
    return Response(response_data, status=response_status)


# Presentaciones endpoints
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_presentaciones(request, tarea_id):
    """
    List all presentations for a task.
    Only ANALISTA_COMPLIANCE and OFICIAL_COMPLIANCE can view presentations.
    """
    user = request.user
    
    # Verificar permisos - Solo ANALISTA y OFICIAL pueden ver presentaciones
    if user.role not in ['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE']:
        return Response(
            {'error': 'No tienes permisos para ver las presentaciones'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    tarea = get_object_or_404(TareaCumplimiento, pk=tarea_id)
    presentaciones = Presentacion.objects.filter(tarea=tarea).order_by('-fecha_creacion')
    serializer = PresentacionSerializer(presentaciones, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def archivar_presentacion(request, tarea_id):
    """
    Archive a new presentation for a task.
    Only OFICIAL_COMPLIANCE can archive presentations.
    """
    user = request.user
    
    # Verificar permisos - Solo OFICIAL puede archivar
    if user.role != 'OFICIAL_COMPLIANCE':
        return Response(
            {'error': 'Solo el Oficial de Compliance puede archivar presentaciones'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    tarea = get_object_or_404(TareaCumplimiento, pk=tarea_id)
    
    serializer = PresentacionCreateSerializer(
        data=request.data,
        context={'request': request, 'tarea': tarea}
    )
    
    if serializer.is_valid():
        presentacion = serializer.save()
        output_serializer = PresentacionSerializer(presentacion, context={'request': request})
        return Response(
            {
                'message': 'Presentación archivada exitosamente',
                'presentacion': output_serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
