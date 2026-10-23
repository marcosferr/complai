from rest_framework import permissions


class CanDeleteTarea(permissions.BasePermission):
    """
    Permission check for task deletion.
    Only ANALISTA_COMPLIANCE and OFICIAL_COMPLIANCE can delete tasks.
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


class PuedeEditarObligacion(permissions.BasePermission):
    """
    Permiso para corregir el título y la fecha de vencimiento de una obligación.

    Mismo corte que ya rige el borrado de obligaciones y el cambio de área: el plazo de
    cumplimiento no lo mueve quien tiene que cumplirlo.
    """

    ROLES_HABILITADOS = ['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE']

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in self.ROLES_HABILITADOS

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
