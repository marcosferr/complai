from django.urls import path
from . import views

urlpatterns = [
    # Clausulas
    path('', views.ClausulaListCreateView.as_view(), name='clausula-list-create'),
    path('<int:pk>/', views.ClausulaDetailView.as_view(), name='clausula-detail'),
    path('<int:clausula_id>/preview/', views.preview_clausula, name='clausula-preview'),
    path('documento/<int:documento_id>/', views.clausulas_por_documento, name='clausulas-por-documento'),
    
    # Relaciones entre clausulas
    path('relaciones/', views.ClausulaRelacionadaListCreateView.as_view(), name='clausula-relacion-list-create'),
    path('relaciones/<int:pk>/', views.ClausulaRelacionadaDetailView.as_view(), name='clausula-relacion-detail'),
    
    # Adendas
    path('adendas/', views.AdendaListCreateView.as_view(), name='adenda-list-create'),
    path('adendas/<int:pk>/', views.AdendaDetailView.as_view(), name='adenda-detail'),
    path('adendas/<int:pk>/aplicar/', views.aplicar_adenda, name='adenda-aplicar'),
    
    # Comparación de cláusulas entre documentos
    path('comparar/<int:documento_base_id>/<int:documento_comparado_id>/', 
         views.comparar_clausulas_documentos, 
         name='comparar-clausulas-documentos'),
]
