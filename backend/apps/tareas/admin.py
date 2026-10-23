from django.contrib import admin

from .models import Area, NivelRiesgo, TareaCumplimiento, ChecklistItem, ComentarioTarea, ArchivoRespaldo


@admin.register(NivelRiesgo)
class NivelRiesgoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo', 'creado_en')
    list_filter = ('activo',)
    search_fields = ('nombre', 'descripcion')


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo', 'creado_en')
    list_filter = ('activo',)
    search_fields = ('nombre', 'descripcion')


class ChecklistItemInline(admin.TabularInline):
    model = ChecklistItem
    extra = 0


class ComentarioTareaInline(admin.TabularInline):
    model = ComentarioTarea
    extra = 0
    readonly_fields = ('usuario', 'texto', 'fecha_creacion')


@admin.register(TareaCumplimiento)
class TareaCumplimientoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'area', 'etapa_actual', 'estado_etapa', 'prioridad', 'fecha_vencimiento')
    list_filter = ('area', 'etapa_actual', 'estado_etapa', 'prioridad')
    search_fields = ('titulo', 'descripcion')
    inlines = [ChecklistItemInline, ComentarioTareaInline]


@admin.register(ArchivoRespaldo)
class ArchivoRespaldoAdmin(admin.ModelAdmin):
    list_display = ('tarea', 'nombre_original', 'subido_por', 'fecha_subida')
    list_filter = ('fecha_subida',)
    search_fields = ('nombre_original', 'descripcion')