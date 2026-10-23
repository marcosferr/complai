from django.urls import path

from . import views

urlpatterns = [
    path('', views.DocumentoListCreateView.as_view(), name='documento-list-create'),
    path('<int:pk>/', views.DocumentoDetailView.as_view(), name='documento-detail'),
    path('upload/', views.upload_document, name='documento-upload'),
    path('<int:pk>/reprocess/', views.reprocess_document, name='documento-reprocess'),
    path('<int:pk>/transcripcion/', views.update_transcripcion, name='documento-update-transcripcion'),
    path('<int:pk>/accept-clausulas/', views.accept_clausulas, name='documento-accept-clausulas'),
    path('<int:pk>/link-parent/', views.link_parent_document, name='documento-link-parent'),
    path('<int:pk>/toggle-pin/', views.toggle_pin_document, name='documento-toggle-pin'),
    path('<int:pk>/graph-layout/', views.save_graph_layout, name='documento-graph-layout'),
    path('<int:pk>/link-auxiliary/', views.link_auxiliary_document, name='documento-link-auxiliary'),
    path('<int:pk>/unlink-auxiliary/<int:aux_id>/', views.unlink_auxiliary_document, name='documento-unlink-auxiliary'),
    
    # Addendums (Adendas)
    path('<int:documento_id>/adendas/', views.documento_adendas, name='documento-adendas'),
    path('<int:documento_id>/adendas/<int:adenda_id>/', views.adenda_detail, name='adenda-detail'),
    
    # Clause Versions
    path('adendas/<int:adenda_id>/create-clause-version/', views.create_clause_version, name='create-clause-version'),
    path('clausulas/<int:clausula_id>/versions/', views.clause_versions, name='clause-versions'),
    
    # File History
    path('<int:documento_id>/file-history/', views.documento_file_history, name='documento-file-history'),
]