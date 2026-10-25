from rest_framework import permissions


class CanDeleteClausula(permissions.BasePermission):
    """
    Permission check for clause deletion.
    Only ANALISTA_UOC and ADMINISTRADOR_CONTRATO can delete clauses.
    """
    
    def has_permission(self, request, view):
        # Solo verificar para método DELETE
        if request.method != 'DELETE':
            return True
        
        # Verificar que el usuario esté autenticado
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Solo ANALISTA_UOC y ADMINISTRADOR_CONTRATO pueden eliminar
        return request.user.role in ['ANALISTA_UOC', 'ADMINISTRADOR_CONTRATO']
    
    def has_object_permission(self, request, view, obj):
        # Solo verificar para método DELETE
        if request.method != 'DELETE':
            return True
        
        # Verificar que el usuario esté autenticado
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Solo ANALISTA_UOC y ADMINISTRADOR_CONTRATO pueden eliminar
        return request.user.role in ['ANALISTA_UOC', 'ADMINISTRADOR_CONTRATO']
