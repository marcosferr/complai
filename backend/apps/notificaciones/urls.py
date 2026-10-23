from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificacionViewSet, NotificacionConfiguracionViewSet

router = DefaultRouter()
router.register(r'', NotificacionViewSet, basename='notificacion')
router.register(r'configuracion', NotificacionConfiguracionViewSet, basename='notificacion-configuracion')

urlpatterns = [
    path('', include(router.urls)),
]
