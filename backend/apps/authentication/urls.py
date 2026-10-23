from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('refresh/', views.refresh_token, name='refresh_token'),
    path('user/', views.user_profile, name='user_profile'),
    
    # Tutorial management
    path('tutorial/', views.tutorial_state, name='tutorial_state'),
    path('tutorial/reset/', views.reset_tutorial, name='reset_tutorial'),
    
    # User management
    path('users/', views.UserListCreateView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/list/', views.users_list, name='users-list'),
    
    # Password reset
    path('password-reset/', views.request_password_reset, name='password_reset_request'),
    path('password-reset/confirm/', views.reset_password_confirm, name='password_reset_confirm'),
]
