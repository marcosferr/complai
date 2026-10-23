from django.contrib import admin
from .models import Auditoria, DocumentoAuditoria, ArchivoAuditoria


class DocumentoAuditoriaInline(admin.TabularInline):
    model = DocumentoAuditoria
    extra = 1
    autocomplete_fields = ['documento']


class ArchivoAuditoriaInline(admin.TabularInline):
    model = ArchivoAuditoria
    extra = 1
    readonly_fields = ['fecha_subida']


@admin.register(Auditoria)
class AuditoriaAdmin(admin.ModelAdmin):
    list_display = [
        'titulo', 'fecha_programada', 'estado', 'responsable',
        'fecha_creacion'
    ]
    list_filter = ['estado', 'fecha_programada']
    search_fields = ['titulo', 'descripcion']
    date_hierarchy = 'fecha_programada'
    inlines = [DocumentoAuditoriaInline, ArchivoAuditoriaInline]
    
    fieldsets = (
        ('Información General', {
            'fields': ('titulo', 'descripcion', 'estado')
        }),
        ('Fechas', {
            'fields': ('fecha_programada', 'fecha_inicio', 'fecha_finalizacion')
        }),
        ('Equipo', {
            'fields': ('responsable', 'equipo')
        }),
        ('Resultados', {
            'fields': ('hallazgos', 'recomendaciones', 'conclusion'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('creado_por', 'fecha_creacion', 'ultima_modificacion'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['fecha_creacion', 'ultima_modificacion']


@admin.register(DocumentoAuditoria)
class DocumentoAuditoriaAdmin(admin.ModelAdmin):
    list_display = ['auditoria', 'documento', 'fecha_asignacion']
    list_filter = ['fecha_asignacion']
    search_fields = ['auditoria__titulo', 'documento__titulo']
    date_hierarchy = 'fecha_asignacion'


@admin.register(ArchivoAuditoria)
class ArchivoAuditoriaAdmin(admin.ModelAdmin):
    list_display = ['nombre_archivo', 'auditoria', 'tipo', 'subido_por', 'fecha_subida']
    list_filter = ['tipo', 'fecha_subida']
    search_fields = ['nombre_archivo', 'descripcion', 'auditoria__titulo']
    date_hierarchy = 'fecha_subida'
    readonly_fields = ['fecha_subida']
