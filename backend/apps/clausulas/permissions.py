from rest_framework import permissions


class CanDeleteClausula(permissions.BasePermission):
    """
    Permission check for clause deletion.
    Only ANALISTA_COMPLIANCE and OFICIAL_COMPLIANCE can delete clauses.
    """
    
    def has_permission(self, request, view):
        # Solo verificar para método DELETE
        if request.method != 'DELETE':
            return True
        
        # Verificar que el usuario esté autenticado
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Solo ANALISTA_COMPLIANCE y OFICIAL_COMPLIANCE pueden eliminar
        return request.user.role in ['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE']
    
    def has_object_permission(self, request, view, obj):
        # Solo verificar para método DELETE
        if request.method != 'DELETE':
            return True
        
        # Verificar que el usuario esté autenticado
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Solo ANALISTA_COMPLIANCE y OFICIAL_COMPLIANCE pueden eliminar
        return request.user.role in ['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE']
