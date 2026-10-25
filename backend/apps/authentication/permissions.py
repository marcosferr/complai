"""Permisos de la administración de usuarios.

Estas vistas manejan alta, baja y cambio de rol de personas: son la superficie
de escalada de privilegios más directa del sistema. Se cierran acá, no en el
frontend (ISO/IEC 27001 A.5.15 — control de acceso; A.8.2 — derechos de acceso
privilegiado).
"""

from rest_framework import permissions

# Roles con potestad para administrar cuentas ajenas. Ojo: el modelo Usuario no
# tiene un rol llamado ADMIN — el administrador funcional es ADMINISTRADOR_CONTRATO.
ROLES_ADMINISTRADORES = ('ADMINISTRADOR_CONTRATO',)


def es_administrador(user) -> bool:
    """¿Este usuario puede administrar cuentas de otras personas?"""
    if not user or not user.is_authenticated:
        return False
    return bool(user.is_superuser) or getattr(user, 'role', None) in ROLES_ADMINISTRADORES


class EsAdministradorDeUsuarios(permissions.BasePermission):
    """Solo un administrador lista, crea, modifica o desactiva cuentas.

    Sin esto, `IsAuthenticated` a secas permite que cualquier sesión válida
    —incluida una con el rol más bajo— se ascienda
    a sí misma, cambie la contraseña de otra persona o desactive a cualquiera.
    """

    message = 'No tenés permiso para administrar usuarios.'

    def has_permission(self, request, view):
        return es_administrador(request.user)

    def has_object_permission(self, request, view, obj):
        return es_administrador(request.user)
