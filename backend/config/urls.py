"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from common.views import health_check
from apps.documentos.media_views import ProtectedMediaView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/documentos/', include('apps.documentos.urls')),
    path('api/clausulas/', include('apps.clausulas.urls')),
    path('api/tareas/', include('apps.tareas.urls')),
    path('api/auditorias/', include('apps.auditorias.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/notificaciones/', include('apps.notificaciones.urls')),
    
    # Protected media endpoint - requires JWT authentication
    re_path(r'^api/media/(?P<path>.*)$', ProtectedMediaView.as_view(), name='protected_media'),
]

# Static files are always served (not protected)
# Media files are served through the protected endpoint above
