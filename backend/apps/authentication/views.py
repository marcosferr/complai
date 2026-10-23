from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db import models
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from .serializers import LoginSerializer, UserSerializer, UserCreateSerializer, UserUpdateSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer
from .permissions import EsAdministradorDeUsuarios
from .models import Usuario
from common.pagination import StandardResultsSetPagination
from config.throttling import LoginThrottle, PasswordResetThrottle



@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login(request):
    """Login endpoint"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        # Try to find user by email or username
        try:
            user_obj = Usuario.objects.get(
                models.Q(email=username) | models.Q(username=username)
            )
            # Authenticate with actual username
            user = authenticate(request=request, username=user_obj.username, password=password)
        except Usuario.DoesNotExist:
            user = None
        
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        else:
            return Response(
                {'error': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """Refresh JWT token and return new refresh token (with rotation)"""
    try:
        refresh_token_str = request.data.get('refresh')
        if not refresh_token_str:
            return Response(
                {'error': 'Refresh token requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        token = RefreshToken(refresh_token_str)
        
        # Return both new access and refresh tokens (rotation enabled)
        return Response({
            'access': str(token.access_token),
            'refresh': str(token)  # New refresh token due to rotation
        })
    except Exception as e:
        return Response(
            {'error': 'Token de refresh inválido o expirado'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user profile"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user"""
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Logout successful'})
    except Exception:
        return Response(
            {'error': 'Error al cerrar sesión'},
            status=status.HTTP_400_BAD_REQUEST
        )


class UserListCreateView(generics.ListCreateAPIView):
    """List all users or create a new user. Solo administradores (A.5.15)."""
    permission_classes = [IsAuthenticated, EsAdministradorDeUsuarios]
    pagination_class = StandardResultsSetPagination
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Usuario.objects.all().order_by('-date_joined')
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by is_active
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search by name or email
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search) |
                models.Q(email__icontains=search)
            )
        
        return queryset


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a user. Solo administradores (A.5.15)."""
    permission_classes = [IsAuthenticated, EsAdministradorDeUsuarios]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_queryset(self):
        return Usuario.objects.all()
    
    def perform_destroy(self, instance):
        # Soft delete - just deactivate the user
        instance.is_active = False
        instance.save()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def users_list(request):
    """Get simplified list of users (for dropdowns)"""
    user = request.user
    users = Usuario.objects.filter(
        is_active=True
    ).values('id', 'email', 'first_name', 'last_name', 'role')
    
    return Response(list(users))


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def tutorial_state(request):
    """Get or update tutorial state for the current user"""
    user = request.user
    
    if request.method == 'GET':
        return Response({
            'tutorial_completed': user.tutorial_completed,
            'tutorial_step': user.tutorial_step
        })
    
    # POST - Update tutorial state
    data = request.data
    
    # Update tutorial_completed if provided
    if 'tutorial_completed' in data:
        user.tutorial_completed = data['tutorial_completed']
    
    # Update tutorial_step if provided (merge with existing)
    if 'tutorial_step' in data:
        current_steps = user.tutorial_step or {}
        if isinstance(data['tutorial_step'], dict):
            current_steps.update(data['tutorial_step'])
            user.tutorial_step = current_steps
    
    user.save(update_fields=['tutorial_completed', 'tutorial_step'])
    
    return Response({
        'tutorial_completed': user.tutorial_completed,
        'tutorial_step': user.tutorial_step,
        'message': 'Estado del tutorial actualizado correctamente'
    })

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def request_password_reset(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        try:
            user = Usuario.objects.get(email=email)
        except Usuario.DoesNotExist:
            # Don't reveal that the user doesn't exist
            return Response({'message': 'Si el correo existe, se ha enviado un enlace de recuperación.'})

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
        
        # Send email
        subject = 'Restablecer contraseña - UNI Contratos'
        message = f"""
        Hola {user.first_name},
        
        Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:
        
        {reset_link}
        
        Si no solicitaste esto, ignora este correo.
        """
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Error sending email: {e}")
            return Response({'error': 'Error al enviar el correo'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({'message': 'Si el correo existe, se ha enviado un enlace de recuperación.'})
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_confirm(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        
        try:
            uid = force_str(urlsafe_base64_decode(uid))
            user = Usuario.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            user = None
            
        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(password)
            user.save()
            return Response({'message': 'Contraseña restablecida exitosamente.'})
        else:
            return Response({'error': 'Enlace inválido o expirado.'}, status=status.HTTP_400_BAD_REQUEST)
            
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_tutorial(request):
    """Reset tutorial state to restart the guided tour"""
    user = request.user
    
    user.tutorial_completed = False
    user.tutorial_step = {}
    user.save(update_fields=['tutorial_completed', 'tutorial_step'])
    
    return Response({
        'tutorial_completed': user.tutorial_completed,
        'tutorial_step': user.tutorial_step,
        'message': 'Tutorial reiniciado correctamente'
    })