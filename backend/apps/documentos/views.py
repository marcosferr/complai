from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from .models import DocumentoLegal
from .serializers import (
    DocumentoSerializer, 
    DocumentoUploadSerializer, 
    DocumentoDetailSerializer,
    TranscripcionUpdateSerializer
)
from apps.clausulas.models import Clausula
import logging

logger = logging.getLogger(__name__)


class DocumentoListCreateView(generics.ListCreateAPIView):
    """List and create documents"""
    serializer_class = DocumentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only return active documents (soft delete filter)
        return DocumentoLegal.objects.filter(esta_activo=True)
    
    def perform_create(self, serializer):
        serializer.save(
            creado_por=self.request.user
        )


class DocumentoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update and delete a document"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return DocumentoDetailSerializer
        return DocumentoSerializer
    
    def get_queryset(self):
        # Only return active documents (soft delete filter)
        return DocumentoLegal.objects.filter(esta_activo=True)
    
    def perform_destroy(self, instance):
        """Soft delete - set esta_activo to False instead of deleting"""
        instance.esta_activo = False
        instance.save(update_fields=['esta_activo'])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_document(request):
    """Upload and process a document"""
    serializer = DocumentoUploadSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        document = serializer.save()
        from .tasks import process_document
        from django.db import connection
        process_document.delay(document.id)
        
        return Response(DocumentoSerializer(document).data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reprocess_document(request, pk):
    """Reprocess a document with OCR and AI extraction"""
    try:
        document = DocumentoLegal.objects.get(pk=pk)
        
        # Check if already processing
        if document.estado_procesamiento_ia == 'PROCESANDO':
            return Response(
                {'error': 'El documento ya está siendo procesado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset processing fields
        document.estado_procesamiento_ia = 'PENDIENTE'
        document.error_procesamiento = ''
        document.save(update_fields=['estado_procesamiento_ia', 'error_procesamiento'])
        from .tasks import process_document
        from django.db import connection
        task = process_document.delay(document.id)
        
        logger.info(f"Reprocessing document {pk}, task_id: {task.id}")
        
        return Response({
            'message': 'Reprocesamiento iniciado',
            'task_id': task.id,
            'estado': document.estado_procesamiento_ia
        }, status=status.HTTP_200_OK)
        
    except DocumentoLegal.DoesNotExist:
        return Response(
            {'error': 'Documento no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_transcripcion(request, pk):
    """Update the editable transcription of a document"""
    try:
        document = DocumentoLegal.objects.get(pk=pk)
        
        serializer = TranscripcionUpdateSerializer(
            document, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except DocumentoLegal.DoesNotExist:
        return Response(
            {'error': 'Documento no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_clausulas(request, pk):
    """
    Accept and create clauses from AI-extracted clauses
    Expects: { "clausula_indices": [0, 1, 2] } to accept specific clauses
    Or: { "accept_all": true } to accept all clauses
    """
    try:
        document = DocumentoLegal.objects.get(pk=pk)
        
        if not document.clausulas_extraidas_ia:
            return Response(
                {'error': 'No hay cláusulas extraídas para aceptar'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        accept_all = request.data.get('accept_all', False)
        clausula_indices = request.data.get('clausula_indices', [])
        
        if not accept_all and not clausula_indices:
            return Response(
                {'error': 'Debe especificar clausula_indices o accept_all'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_count = 0
        clausulas_to_accept = []
        
        # Determine which clauses to accept
        if accept_all:
            clausulas_to_accept = [
                (i, c) for i, c in enumerate(document.clausulas_extraidas_ia)
                if not c.get('aceptada', False)
            ]
        else:
            clausulas_to_accept = [
                (i, document.clausulas_extraidas_ia[i])
                for i in clausula_indices
                if i < len(document.clausulas_extraidas_ia) and 
                not document.clausulas_extraidas_ia[i].get('aceptada', False)
            ]
        
        # Create clauses in a transaction
        with transaction.atomic():
            for index, clausula_data in clausulas_to_accept:
                # Create the clause
                Clausula.objects.create(
                    documento=document,
                    titulo=clausula_data.get('titulo', f'Cláusula {index + 1}'),
                    contenido=clausula_data.get('contenido', ''),
                    numero_orden=clausula_data.get('numero_orden', index + 1),
                    etiquetas=[clausula_data.get('categoria')] if clausula_data.get('categoria') else [],
                    creada_por=request.user
                )
                
                # Mark as accepted in the extracted clauses
                document.clausulas_extraidas_ia[index]['aceptada'] = True
                created_count += 1
            
            # Save updated document
            document.save(update_fields=['clausulas_extraidas_ia'])
        
        logger.info(f"Created {created_count} clauses for document {pk}")
        
        return Response({
            'message': f'Se crearon {created_count} cláusulas exitosamente',
            'created_count': created_count,
            'total_clausulas': document.clausulas.count()
        }, status=status.HTTP_201_CREATED)
        
    except DocumentoLegal.DoesNotExist:
        return Response(
            {'error': 'Documento no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error accepting clauses: {e}", exc_info=True)
        return Response(
            {'error': f'Error al crear cláusulas: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_pin_document(request, pk):
    """
    Toggle the pinned status of a document
    """
    try:
        document = DocumentoLegal.objects.get(pk=pk)
        
        if document.fijado:
            # Unpin the document
            document.fijado = False
            document.fecha_fijado = None
            document.save(update_fields=['fijado', 'fecha_fijado'])
            message = 'Documento desfijado exitosamente'
        else:
            # Pin the document
            from django.utils import timezone
            document.fijado = True
            document.fecha_fijado = timezone.now()
            document.save(update_fields=['fijado', 'fecha_fijado'])
            message = 'Documento fijado exitosamente'
        
        return Response({
            'message': message,
            'fijado': document.fijado,
            'fecha_fijado': document.fecha_fijado.isoformat() if document.fecha_fijado else None
        }, status=status.HTTP_200_OK)
        
    except DocumentoLegal.DoesNotExist:
        return Response(
            {'error': 'Documento no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_graph_layout(request, pk):
    """Persist graph node positions for a document"""
    try:
        document = DocumentoLegal.objects.get(pk=pk, esta_activo=True)
    except DocumentoLegal.DoesNotExist:
        return Response(
            {'error': 'Documento no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )

    layout = request.data.get('posiciones_grafo', request.data.get('layout', request.data))

    if not isinstance(layout, dict):
        return Response(
            {'error': 'posiciones_grafo debe ser un objeto JSON'},
            status=status.HTTP_400_BAD_REQUEST
        )

    nodes = layout.get('nodes', {}) if isinstance(layout.get('nodes', {}), dict) else None
    viewport = layout.get('viewport') if isinstance(layout.get('viewport', {}), dict) else None

    if nodes is None:
        return Response(
            {'error': 'nodes debe ser un objeto donde cada clave es el id del nodo'},
            status=status.HTTP_400_BAD_REQUEST
        )

    cleaned_nodes = {}
    for node_id, position in nodes.items():
        if not isinstance(position, dict) or 'x' not in position or 'y' not in position:
            return Response(
                {'error': f'Posición inválida para el nodo {node_id}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            cleaned_nodes[node_id] = {
                'x': float(position['x']),
                'y': float(position['y']),
            }
        except (TypeError, ValueError):
            return Response(
                {'error': f'Las coordenadas de {node_id} deben ser numéricas'},
                status=status.HTTP_400_BAD_REQUEST
            )

    cleaned_layout = {'nodes': cleaned_nodes}

    if viewport:
        if not all(k in viewport for k in ['x', 'y', 'zoom']):
            return Response(
                {'error': 'viewport debe incluir x, y y zoom'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            cleaned_layout['viewport'] = {
                'x': float(viewport['x']),
                'y': float(viewport['y']),
                'zoom': float(viewport['zoom']),
            }
        except (TypeError, ValueError):
            return Response(
                {'error': 'Las coordenadas del viewport deben ser numéricas'},
                status=status.HTTP_400_BAD_REQUEST
            )

    document.posiciones_grafo = cleaned_layout
    document.save(update_fields=['posiciones_grafo'])

    logger.info(f"Graph layout saved for document {pk} with {len(cleaned_nodes)} nodes")

    return Response(
        {
            'message': 'Posiciones del grafo guardadas correctamente',
            'posiciones_grafo': document.posiciones_grafo,
        },
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_parent_document(request, pk):
    """
    Link a parent document to this document
    Expects: { "documento_padre_id": <id> }
    """
    try:
        document = DocumentoLegal.objects.get(pk=pk)
        
        documento_padre_id = request.data.get('documento_padre_id')
        
        if not documento_padre_id:
            return Response(
                {'error': 'documento_padre_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            documento_padre = DocumentoLegal.objects.get(pk=documento_padre_id)
        except DocumentoLegal.DoesNotExist:
            return Response(
                {'error': 'Documento padre no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prevent self-linking
        if document.id == documento_padre.id:
            return Response(
                {'error': 'Un documento no puede ser su propio padre'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent circular references - check if parent is already a child
        if documento_padre.documento_padre_id == document.id:
            return Response(
                {'error': 'No se puede crear una referencia circular'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Link the parent document
        document.documento_padre = documento_padre
        document.save(update_fields=['documento_padre'])
        
        logger.info(f"Linked document {pk} to parent {documento_padre_id}")
        
        return Response(
            DocumentoDetailSerializer(document).data,
            status=status.HTTP_200_OK
        )
        
    except DocumentoLegal.DoesNotExist:
        return Response(
            {'error': 'Documento no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unlink_parent_document(request, pk):
    """
    Remove the parent document link from this document
    """
    try:
        document = DocumentoLegal.objects.get(pk=pk)
        
        if not document.documento_padre:
            return Response(
                {'error': 'Este documento no tiene un documento padre vinculado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Remove the link
        document.documento_padre = None
        document.save(update_fields=['documento_padre'])
        
        logger.info(f"Unlinked parent document from document {pk}")
        
        return Response(
            DocumentoDetailSerializer(document).data,
            status=status.HTTP_200_OK
        )
        
    except DocumentoLegal.DoesNotExist:
        return Response(
            {'error': 'Documento no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_auxiliary_document(request, pk):
    """
    Link an auxiliary document to this document
    Expects: { "documento_auxiliar_id": <id> }
    """
    try:
        document = DocumentoLegal.objects.get(pk=pk)
        
        documento_auxiliar_id = request.data.get('documento_auxiliar_id')
        
        if not documento_auxiliar_id:
            return Response(
                {'error': 'documento_auxiliar_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            documento_auxiliar = DocumentoLegal.objects.get(pk=documento_auxiliar_id)
        except DocumentoLegal.DoesNotExist:
            return Response(
                {'error': 'Documento auxiliar no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prevent self-linking
        if document.id == documento_auxiliar.id:
            return Response(
                {'error': 'Un documento no puede ser su propio auxiliar'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already linked
        if document.documentos_auxiliares.filter(id=documento_auxiliar.id).exists():
            return Response(
                {'error': 'Este documento ya está vinculado como auxiliar'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Link the auxiliary document
        document.documentos_auxiliares.add(documento_auxiliar)
        
        logger.info(f"Linked auxiliary document {documento_auxiliar_id} to document {pk}")
        
        return Response(
            DocumentoDetailSerializer(document).data,
            status=status.HTTP_200_OK
        )
        
    except DocumentoLegal.DoesNotExist:
        return Response(
            {'error': 'Documento no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unlink_auxiliary_document(request, pk, aux_id):
    """
    Remove an auxiliary document link from this document
    """
    try:
        document = DocumentoLegal.objects.get(pk=pk)
        
        try:
            documento_auxiliar = DocumentoLegal.objects.get(pk=aux_id)
        except DocumentoLegal.DoesNotExist:
            return Response(
                {'error': 'Documento auxiliar no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not document.documentos_auxiliares.filter(id=aux_id).exists():
            return Response(
                {'error': 'Este documento no está vinculado como auxiliar'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Remove the link
        document.documentos_auxiliares.remove(documento_auxiliar)
        
        logger.info(f"Unlinked auxiliary document {aux_id} from document {pk}")
        
        return Response(
            DocumentoDetailSerializer(document).data,
            status=status.HTTP_200_OK
        )
        
    except DocumentoLegal.DoesNotExist:
        return Response(
            {'error': 'Documento no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )


# ========== ADENDAS (ADDENDUMS) VIEWS ==========

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def documento_adendas(request, documento_id):
    """
    GET: List all addendums for a document
    POST: Create a new addendum for a document
    """
    from .models import Adenda, HistorialArchivo
    from .serializers import AdendaSerializer
    try:
        documento = DocumentoLegal.objects.get(pk=documento_id)
    except DocumentoLegal.DoesNotExist:
        return Response(
            {'error': 'Documento no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        adendas = Adenda.objects.filter(documento_base=documento)
        serializer = AdendaSerializer(adendas, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Get next addendum number
        ultimo_numero = Adenda.objects.filter(
            documento_base=documento
        ).order_by('-numero').first()
        
        siguiente_numero = (ultimo_numero.numero + 1) if ultimo_numero else 1
        
        # No usar request.data.copy(): deepcopy falla con TemporaryUploadedFile (>2.5MB)
        data = {key: request.data[key] for key in request.data}
        data['documento_base'] = documento.id
        data['numero'] = siguiente_numero
        
        serializer = AdendaSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            adenda = serializer.save(creado_por=request.user)
            
            # Trigger addendum processing task
            from .tasks import process_addendum
            from django.db import connection
            process_addendum.delay(adenda.id)
            
            logger.info(f"Created addendum #{adenda.numero} for document {documento_id}")
            
            return Response(
                AdendaSerializer(adenda).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def adenda_detail(request, documento_id, adenda_id):
    """
    Retrieve, update, or delete an addendum
    """
    from .models import Adenda
    from .serializers import AdendaSerializer
    
    try:
        adenda = Adenda.objects.get(
            pk=adenda_id,
            documento_base__id=documento_id)
    except Adenda.DoesNotExist:
        return Response(
            {'error': 'Adenda no encontrada'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = AdendaSerializer(adenda)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = AdendaSerializer(adenda, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Updated addendum {adenda_id}")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        adenda.delete()
        logger.info(f"Deleted addendum {adenda_id}")
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_clause_version(request, adenda_id):
    """
    Create a new version of a clause linked to an addendum
    Expects: { "clausula_id": 1, "contenido": "...", "observaciones": "..." }
    """
    from .models import Adenda, VersionClausula
    from .serializers import VersionClausulaSerializer
    
    try:
        adenda = Adenda.objects.get(
            pk=adenda_id)
    except Adenda.DoesNotExist:
        return Response(
            {'error': 'Adenda no encontrada'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    clausula_id = request.data.get('clausula_id')
    if not clausula_id:
        return Response(
            {'error': 'clausula_id es requerido'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        clausula = Clausula.objects.get(
            pk=clausula_id,
            documento=adenda.documento_base
        )
    except Clausula.DoesNotExist:
        return Response(
            {'error': 'Cláusula no encontrada'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get next version number
    ultima_version = VersionClausula.objects.filter(
        clausula=clausula
    ).order_by('-numero_version').first()
    
    siguiente_version = (ultima_version.numero_version + 1) if ultima_version else 1
    
    # Deactivate previous versions
    VersionClausula.objects.filter(clausula=clausula).update(activa=False)
    
    # Create new version
    version = VersionClausula.objects.create(
        clausula=clausula,
        adenda=adenda,
        numero_version=siguiente_version,
        contenido=request.data.get('contenido', ''),
        observaciones=request.data.get('observaciones', ''),
        activa=True,
        creado_por=request.user
    )
    
    logger.info(f"Created version {siguiente_version} for clause {clausula_id}")
    
    serializer = VersionClausulaSerializer(version)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clause_versions(request, clausula_id):
    """
    Get all versions of a clause including the original clause content
    """
    from .models import VersionClausula
    from .serializers import VersionClausulaSerializer
    from apps.clausulas.serializers import ClausulaSerializer
    
    try:
        clausula = Clausula.objects.get(
            pk=clausula_id)
    except Clausula.DoesNotExist:
        return Response(
            {'error': 'Cláusula no encontrada'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get all versions from addendums
    versiones = VersionClausula.objects.filter(clausula=clausula).select_related('adenda', 'creado_por')
    versiones_data = VersionClausulaSerializer(versiones, many=True).data
    
    # Include the original clause as version 0
    clausula_data = ClausulaSerializer(clausula).data
    
    response_data = {
        'clausula_original': clausula_data,
        'versiones': versiones_data,
        'version_activa': next((v for v in versiones_data if v['activa']), None)
    }
    
    return Response(response_data)


# ========== FILE HISTORY VIEWS ==========

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def documento_file_history(request, documento_id):
    """
    GET: List all file uploads for a document
    POST: Upload a new file version for a document
    """
    from .models import HistorialArchivo
    from .serializers import HistorialArchivoSerializer
    
    try:
        documento = DocumentoLegal.objects.get(pk=documento_id)
    except DocumentoLegal.DoesNotExist:
        return Response(
            {'error': 'Documento no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        historial = HistorialArchivo.objects.filter(documento=documento)
        serializer = HistorialArchivoSerializer(historial, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response(
                {'error': 'Se requiere un archivo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get next version number
        ultima_version = HistorialArchivo.objects.filter(
            documento=documento
        ).order_by('-version_numero').first()
        
        siguiente_version = (ultima_version.version_numero + 1) if ultima_version else 1
        
        # Create history entry
        historial = HistorialArchivo.objects.create(
            documento=documento,
            archivo=archivo,
            version_numero=siguiente_version,
            notas=request.data.get('notas', ''),
            subido_por=request.user
        )
        
        # Update document's current file
        documento.archivo = archivo
        documento.version = siguiente_version
        documento.save(update_fields=['archivo', 'version'])
        
        # Trigger reprocessing
        from .tasks import process_document
        from django.db import connection
        process_document.delay(documento.id)
        
        logger.info(f"Uploaded new file version {siguiente_version} for document {documento_id}")
        
        serializer = HistorialArchivoSerializer(historial)
        return Response(serializer.data, status=status.HTTP_201_CREATED)