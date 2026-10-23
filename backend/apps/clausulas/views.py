from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Clausula, ClausulaRelacionada, Adenda
from .serializers import (
    ClausulaSerializer,
    ClausulaDetalleSerializer,
    ClausulaRelacionadaSerializer,
    AdendaSerializer,
    AplicarAdendaSerializer
)
from .permissions import CanDeleteClausula


class ClausulaListCreateView(generics.ListCreateAPIView):
    """List all clauses or create a new clause"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ClausulaSerializer
        return ClausulaSerializer
    
    def get_queryset(self):
        """Filter by document if provided"""
        queryset = Clausula.objects.select_related('documento', 'creada_por')
        documento_id = self.request.query_params.get('documento')
        if documento_id:
            queryset = queryset.filter(documento_id=documento_id)
        return queryset


class ClausulaDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a clause"""
    permission_classes = [IsAuthenticated, CanDeleteClausula]
    serializer_class = ClausulaDetalleSerializer
    queryset = Clausula.objects.select_related('documento', 'creada_por').prefetch_related(
        'relaciones_salientes',
        'relaciones_entrantes',
        'tareas',
        'adendas'
    )


class ClausulaRelacionadaListCreateView(generics.ListCreateAPIView):
    """List all clause relationships or create a new relationship"""
    permission_classes = [IsAuthenticated]
    serializer_class = ClausulaRelacionadaSerializer
    
    def get_queryset(self):
        """Filter by clause if provided"""
        queryset = ClausulaRelacionada.objects.select_related(
            'clausula_principal',
            'clausula_relacionada',
            'creada_por'
        )
        clausula_id = self.request.query_params.get('clausula')
        if clausula_id:
            queryset = queryset.filter(
                clausula_principal_id=clausula_id
            ) | queryset.filter(
                clausula_relacionada_id=clausula_id
            )
        return queryset


class ClausulaRelacionadaDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a clause relationship"""
    permission_classes = [IsAuthenticated]
    serializer_class = ClausulaRelacionadaSerializer
    queryset = ClausulaRelacionada.objects.select_related(
        'clausula_principal',
        'clausula_relacionada',
        'creada_por'
    )


class AdendaListCreateView(generics.ListCreateAPIView):
    """List all addendums or create a new addendum"""
    permission_classes = [IsAuthenticated]
    serializer_class = AdendaSerializer
    
    def get_queryset(self):
        """Filter by clause if provided"""
        queryset = Adenda.objects.select_related('clausula', 'creada_por', 'archivo')
        clausula_id = self.request.query_params.get('clausula')
        if clausula_id:
            queryset = queryset.filter(clausula_id=clausula_id)
        return queryset


class AdendaDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete an addendum"""
    permission_classes = [IsAuthenticated]
    serializer_class = AdendaSerializer
    queryset = Adenda.objects.select_related('clausula', 'creada_por', 'archivo')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def aplicar_adenda(request, pk):
    """Apply an addendum to a clause"""
    from django.db import transaction
    
    adenda = get_object_or_404(Adenda, pk=pk)
    
    # Check if already fully applied
    if adenda.estado == 'APLICADA':
        return Response(
            {'error': 'Esta adenda ya ha sido aplicada completamente.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = AplicarAdendaSerializer(data=request.data)
    if serializer.is_valid():
        # Use atomic transaction to ensure both saves happen together
        with transaction.atomic():
            # Apply the addendum - update clause content
            clausula = adenda.clausula
            clausula.contenido = adenda.contenido_nuevo
            clausula.save(update_fields=['contenido'])
            
            # Mark addendum as applied
            adenda.estado = 'APLICADA'
            adenda.fecha_aplicacion = timezone.now()
            adenda.save(update_fields=['estado', 'fecha_aplicacion'])
        
        # Refresh from database to ensure we have latest data
        clausula.refresh_from_db()
        adenda.refresh_from_db()
        
        return Response(
            {
                'message': 'Adenda aplicada exitosamente.',
                'clausula': ClausulaSerializer(clausula).data,
                'adenda': AdendaSerializer(adenda).data
            },
            status=status.HTTP_200_OK
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clausulas_por_documento(request, documento_id):
    """Get all clauses for a specific document"""
    clausulas = Clausula.objects.filter(documento_id=documento_id).select_related(
        'documento', 'creada_por'
    ).prefetch_related('tareas', 'relaciones_salientes', 'relaciones_entrantes', 'adendas')
    
    serializer = ClausulaDetalleSerializer(clausulas, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def comparar_clausulas_documentos(request, documento_base_id, documento_comparado_id):
    """
    Compare clauses between two documents (e.g., base contract and addendum).
    Returns a comparison showing which clauses were added, modified, or remain the same.
    """
    from apps.documentos.models import DocumentoLegal
    
    # Validate documents exist
    doc_base = get_object_or_404(DocumentoLegal, pk=documento_base_id)
    doc_comparado = get_object_or_404(DocumentoLegal, pk=documento_comparado_id)
    
    # Get clauses for both documents
    clausulas_base = Clausula.objects.filter(documento_id=documento_base_id).order_by('numero_orden')
    clausulas_comparado = Clausula.objects.filter(documento_id=documento_comparado_id).order_by('numero_orden')
    
    # Create comparison result
    comparison_result = {
        'documento_base': {
            'id': doc_base.id,
            'titulo': doc_base.titulo,
            'tipo': doc_base.tipo,
            'fecha_creacion': doc_base.fecha_creacion
        },
        'documento_comparado': {
            'id': doc_comparado.id,
            'titulo': doc_comparado.titulo,
            'tipo': doc_comparado.tipo,
            'es_adenda': doc_comparado.es_adenda,
            'estado_adenda': doc_comparado.estado_adenda,
            'fecha_creacion': doc_comparado.fecha_creacion
        },
        'clausulas': []
    }
    
    # Create a dict of base clauses by title for easier comparison
    base_dict = {c.titulo: c for c in clausulas_base}
    comparado_dict = {c.titulo: c for c in clausulas_comparado}
    
    # Find all unique clause titles
    all_titles = set(base_dict.keys()) | set(comparado_dict.keys())
    
    for titulo in sorted(all_titles):
        clausula_base = base_dict.get(titulo)
        clausula_comparado = comparado_dict.get(titulo)
        
        if clausula_base and clausula_comparado:
            # Clause exists in both - check if modified
            if clausula_base.contenido == clausula_comparado.contenido:
                status_type = 'unchanged'
            else:
                status_type = 'modified'
        elif clausula_base:
            # Clause only in base - removed in comparison
            status_type = 'removed'
        else:
            # Clause only in comparison - added
            status_type = 'added'
        
        comparison_result['clausulas'].append({
            'titulo': titulo,
            'status': status_type,
            'base': ClausulaSerializer(clausula_base).data if clausula_base else None,
            'comparado': ClausulaSerializer(clausula_comparado).data if clausula_comparado else None
        })
    
    return Response(comparison_result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def preview_clausula(request, clausula_id):
    """
    Get a preview of a clause with basic information and content
    """
    clausula = get_object_or_404(Clausula, pk=clausula_id)
    
    preview_data = {
        'id': clausula.id,
        'titulo': clausula.titulo,
        'contenido': clausula.contenido,
        'numero_orden': clausula.numero_orden,
        'documento': {
            'id': clausula.documento.id,
            'titulo': clausula.documento.titulo,
            'tipo': clausula.documento.tipo
        },
        'etiquetas': clausula.etiquetas,
        'fecha_creacion': clausula.fecha_creacion
    }
    
    return Response(preview_data)

