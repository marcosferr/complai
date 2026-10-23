from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.estadisticas_dashboard, name='dashboard-stats'),
]
