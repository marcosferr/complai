from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Auditoria, DocumentoAuditoria, ArchivoAuditoria
from .serializers import (
    AuditoriaListSerializer,
    AuditoriaDetailSerializer,
    AuditoriaCreateUpdateSerializer,
    DocumentoAuditoriaSerializer,
    ArchivoAuditoriaSerializer
)


class AuditoriaViewSet(viewsets.ModelViewSet):
    """ViewSet for managing audits"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Auditoria.objects.all().select_related(
            'responsable', 'creado_por'
        ).prefetch_related('equipo', 'documentos', 'archivos')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AuditoriaListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return AuditoriaCreateUpdateSerializer
        return AuditoriaDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(
            creado_por=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def add_documento(self, request, pk=None):
        """Add a document to an audit"""
        auditoria = self.get_object()
        documento_id = request.data.get('documento_id')
        notas = request.data.get('notas', '')
        
        if not documento_id:
            return Response(
                {'error': 'documento_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            documento_auditoria = DocumentoAuditoria.objects.create(
                auditoria=auditoria,
                documento_id=documento_id,
                notas=notas
            )
            serializer = DocumentoAuditoriaSerializer(documento_auditoria)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['delete'], url_path='remove_documento/(?P<documento_id>[^/.]+)')
    def remove_documento(self, request, pk=None, documento_id=None):
        """Remove a document from an audit"""
        auditoria = self.get_object()
        
        try:
            documento_auditoria = DocumentoAuditoria.objects.get(
                auditoria=auditoria,
                documento_id=documento_id
            )
            documento_auditoria.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DocumentoAuditoria.DoesNotExist:
            return Response(
                {'error': 'Documento no encontrado en esta auditoría'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def upload_archivo(self, request, pk=None):
        """Upload a file to an audit"""
        auditoria = self.get_object()
        
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response(
                {'error': 'Archivo es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        archivo_auditoria = ArchivoAuditoria.objects.create(
            auditoria=auditoria,
            tipo=request.data.get('tipo', 'OTRO'),
            archivo=archivo,
            nombre_archivo=archivo.name,
            descripcion=request.data.get('descripcion', ''),
            subido_por=request.user
        )
        
        serializer = ArchivoAuditoriaSerializer(archivo_auditoria)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'], url_path='delete_archivo/(?P<archivo_id>[^/.]+)')
    def delete_archivo(self, request, pk=None, archivo_id=None):
        """Delete a file from an audit"""
        auditoria = self.get_object()
        
        try:
            archivo = ArchivoAuditoria.objects.get(
                id=archivo_id,
                auditoria=auditoria
            )
            archivo.archivo.delete()  # Delete the actual file
            archivo.delete()  # Delete the database record
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ArchivoAuditoria.DoesNotExist:
            return Response(
                {'error': 'Archivo no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def programadas(self, request):
        """Get scheduled audits"""
        queryset = self.get_queryset().filter(estado='PROGRAMADA')
        serializer = AuditoriaListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def completadas(self, request):
        """Get completed audits"""
        queryset = self.get_queryset().filter(estado='COMPLETADA')
        serializer = AuditoriaListSerializer(queryset, many=True)
        return Response(serializer.data)
