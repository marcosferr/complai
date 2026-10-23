from django.urls import path
from . import views

urlpatterns = [
    # Tareas
    path('', views.TareaListCreateView.as_view(), name='tarea-list-create'),
    path('crear-multiples/', views.crear_tareas_multiples, name='tarea-crear-multiples'),
    path('<int:pk>/', views.TareaDetailView.as_view(), name='tarea-detail'),
    path('<int:tarea_id>/responsable/', views.actualizar_responsable, name='tarea-actualizar-responsable'),
    path('<int:pk>/editar/', views.editar_obligacion, name='tarea-editar-obligacion'),
    path('<int:tarea_id>/area/', views.actualizar_area_tarea, name='tarea-actualizar-area'),
    path('<int:tarea_id>/tags/', views.actualizar_tags_tarea, name='tarea-actualizar-tags'),
    path('areas/', views.listar_areas, name='tarea-listar-areas'),
    
    # Nuevos endpoints para estados por etapa
    path('<int:pk>/estado-etapa/', views.cambiar_estado_etapa, name='tarea-cambiar-estado-etapa'),
    path('<int:pk>/avanzar-etapa/', views.avanzar_etapa, name='tarea-avanzar-etapa'),
    path('<int:pk>/devolver/', views.devolver_con_observaciones, name='tarea-devolver'),
    path('<int:pk>/cambiar-etapa/', views.cambiar_etapa_directo, name='tarea-cambiar-etapa-directo'),
    path('<int:pk>/remision-autoridad/', views.registrar_remision_autoridad, name='tarea-remision-autoridad'),
    path('<int:pk>/historial/', views.historial_estados, name='tarea-historial-estados'),
    path('estadisticas/', views.estadisticas_por_etapa, name='tareas-estadisticas'),
    
    # Filtros especiales
    path('clausula/<int:clausula_id>/', views.tareas_por_clausula, name='tareas-por-clausula'),
    path('mis-tareas/', views.mis_tareas, name='mis-tareas'),
    
    # Checklist
    path('<int:tarea_id>/checklist/', views.agregar_checklist_item, name='tarea-agregar-checklist'),
    path('<int:tarea_id>/checklist/<int:item_id>/', views.actualizar_checklist_item, name='tarea-actualizar-checklist'),
    path('<int:tarea_id>/checklist/<int:item_id>/eliminar/', views.eliminar_checklist_item, name='tarea-eliminar-checklist'),
    path('<int:tarea_id>/checklist/<int:item_id>/marcar/', views.marcar_checklist_item, name='tarea-marcar-checklist'),
    
    # Comentarios
    path('<int:tarea_id>/comentarios/', views.comentarios_tarea, name='tarea-comentarios'),
    path('<int:tarea_id>/comentarios/<int:comentario_id>/', views.comentario_detalle, name='comentario-detalle'),
    
    # Archivos de respaldo
    path('<int:tarea_id>/archivos/', views.archivos_respaldo_tarea, name='tarea-archivos-respaldo'),
    path('<int:tarea_id>/archivos/<int:archivo_id>/', views.eliminar_archivo_respaldo, name='eliminar-archivo-respaldo'),
    
    # Tags
    path('tags/', views.obtener_tags, name='tarea-obtener-tags'),
    
    # Niveles de Riesgo
    path('niveles-riesgo/', views.niveles_riesgo, name='niveles-riesgo'),
    path('niveles-riesgo/<int:pk>/', views.nivel_riesgo_detalle, name='nivel-riesgo-detalle'),
    
    # Presentaciones
    path('<int:tarea_id>/presentaciones/', views.listar_presentaciones, name='tarea-presentaciones'),
    path('<int:tarea_id>/presentaciones/archivar/', views.archivar_presentacion, name='tarea-archivar-presentacion'),
]
