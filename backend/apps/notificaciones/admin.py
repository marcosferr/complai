from django.contrib import admin
from .models import Notificacion


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    """Admin for Notificacion model"""
    
    list_display = ['titulo', 'usuario', 'tipo', 'leida', 'fecha_creacion']
    list_filter = ['tipo', 'leida', 'fecha_creacion']
    search_fields = ['titulo', 'mensaje', 'usuario__email', 'usuario__first_name', 'usuario__last_name']
    readonly_fields = ['fecha_creacion']
    date_hierarchy = 'fecha_creacion'
    
    fieldsets = (
        ('Información General', {
            'fields': ('usuario', 'tipo', 'titulo', 'mensaje')
        }),
        ('Relacionado', {
            'fields': ('tarea', 'metadata')
        }),
        ('Estado', {
            'fields': ('leida', 'fecha_creacion')
        }),
    )

