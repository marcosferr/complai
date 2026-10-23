from django.contrib import admin
from .models import DocumentoLegal


@admin.register(DocumentoLegal)
class DocumentoLegalAdmin(admin.ModelAdmin):
    list_display = [
        'titulo', 'tipo', 'estado', 'fecha_vencimiento',
        'creado_por', 'fecha_creacion'
    ]
    list_filter = ['tipo', 'estado', 'fecha_vencimiento']
    search_fields = ['titulo', 'contenido_extraido', 'resumen_ia']
    date_hierarchy = 'fecha_creacion'
    readonly_fields = [
        'fecha_creacion', 'ultima_modificacion', 'version',
        'estado_procesamiento_ia', 'fecha_procesamiento'
    ]
    
    fieldsets = (
        ('Información General', {
            'fields': ('titulo', 'tipo', 'archivo', 'estado')
        }),
        ('Contenido', {
            'fields': ('contenido_extraido', 'transcripcion_editable', 'resumen_ia'),
            'classes': ('collapse',)
        }),
        ('Procesamiento IA', {
            'fields': (
                'estado_procesamiento_ia', 'error_procesamiento',
                'clausulas_extraidas_ia', 'fecha_procesamiento'
            ),
            'classes': ('collapse',)
        }),
        ('Fechas y Vencimiento', {
            'fields': ('fecha_vencimiento', 'esta_activo')
        }),
        ('Clasificación', {
            'fields': ('etiquetas', 'palabras_clave'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('creado_por', 'fecha_creacion', 'ultima_modificacion', 'version'),
            'classes': ('collapse',)
        }),
    )
