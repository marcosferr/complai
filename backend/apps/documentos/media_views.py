"""
Protected media serving views with JWT authentication.
Uses X-Accel-Redirect for efficient file serving via Nginx in production.
"""
import os
import mimetypes
from django.conf import settings
from django.http import HttpResponse, FileResponse, Http404
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from apps.authentication.models import Usuario
import logging

logger = logging.getLogger(__name__)


class ProtectedMediaView(APIView):
    """
    Serve media files only to authenticated users.
    Uses X-Accel-Redirect in production for efficient file serving.
    Returns a 404 image for unauthenticated users.
    
    Supports authentication via:
    - Authorization header (Bearer token)
    - Query parameter (?token=...) for img/video src attributes
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]  # We handle auth manually to return 404 image
    
    def get(self, request, path):
        # Check authentication - first try header, then query param
        user = request.user
        
        # If not authenticated via header, try query parameter
        if not user or not user.is_authenticated:
            token = request.query_params.get('token')
            if token:
                try:
                    # Validate the token
                    access_token = AccessToken(token)
                    user_id = access_token.get('user_id')
                    user = Usuario.objects.get(id=user_id)
                except (TokenError, InvalidToken, Usuario.DoesNotExist) as e:
                    logger.warning(f"Invalid token for media access: {e}")
                    user = None
        
        # Validate user - either authenticated via header or valid Usuario from token
        is_valid_user = (
            (user and hasattr(user, 'is_authenticated') and user.is_authenticated) or
            (user and isinstance(user, Usuario))
        )
        
        if not is_valid_user:
            # Return 404 image for unauthenticated users
            return self._serve_404_image()
        
        # Construct the full file path
        file_path = os.path.join(settings.MEDIA_ROOT, path)
        
        # Security check: prevent directory traversal
        real_media_root = os.path.realpath(settings.MEDIA_ROOT)
        real_file_path = os.path.realpath(file_path)
        
        if not real_file_path.startswith(real_media_root):
            logger.warning(f"Directory traversal attempt: {path} by user {user.id}")
            return self._serve_404_image()
        
        # Check if file exists
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            logger.warning(f"File not found: {path}")
            return self._serve_404_image()
        
        # Log access for audit
        logger.info(f"Media access: {path} by user {user.id} ({user.email})")
        
        # Determine content type
        content_type, encoding = mimetypes.guess_type(file_path)
        if content_type is None:
            content_type = 'application/octet-stream'
        
        # Set filename for download
        filename = os.path.basename(file_path)
        
        # Determine Content-Disposition based on content type
        if content_type in ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp']:
            content_disposition = f'inline; filename="{filename}"'
        else:
            content_disposition = f'attachment; filename="{filename}"'
        
        # Delegar el envio al servidor web (X-Sendfile / X-Accel-Redirect) SOLO si
        # esta configurado explicitamente. Ambos headers le piden al proxy que abra
        # el archivo por su cuenta, asi que solo sirven si ese proceso puede leerlo:
        # con el media en un volumen de Docker, Apache (www-data) no puede entrar a
        # /var/lib/docker y responde 404. Sin acelerador, Django lo sirve el mismo.
        use_xsendfile = getattr(settings, 'USE_XSENDFILE', False)
        use_x_accel = getattr(settings, 'USE_X_ACCEL_REDIRECT', False)

        if not settings.DEBUG and (use_xsendfile or use_x_accel):
            response = HttpResponse()
            response['Content-Type'] = content_type
            response['Content-Disposition'] = content_disposition
            
            if use_xsendfile:
                # Apache mod_xsendfile - uses absolute file path
                response['X-Sendfile'] = file_path
            else:
                # Nginx X-Accel-Redirect - uses internal location path
                response['X-Accel-Redirect'] = f'/protected-media/{path}'
            
            return response
        
        # Servir el archivo directamente (desarrollo, y produccion sin acelerador)
        try:
            response = FileResponse(
                open(file_path, 'rb'),
                content_type=content_type
            )
            response['Content-Disposition'] = content_disposition
            return response
        except IOError:
            logger.error(f"Error reading file: {path}")
            return self._serve_404_image()
    
    def _serve_404_image(self):
        """Serve a 404 placeholder image for unauthorized access."""
        # Try to serve custom 404 image from static
        not_found_path = os.path.join(settings.STATIC_ROOT or settings.BASE_DIR / 'static', 'not_found.png')
        
        # Fallback to a static folder location
        if not os.path.exists(not_found_path):
            not_found_path = os.path.join(settings.BASE_DIR, 'static', 'not_found.png')
        
        if os.path.exists(not_found_path):
            try:
                response = FileResponse(
                    open(not_found_path, 'rb'),
                    content_type='image/png'
                )
                response.status_code = 404
                return response
            except IOError:
                pass
        
        # If no image available, return a simple 404 response
        response = HttpResponse(
            b'File not found or access denied',
            content_type='text/plain',
            status=404
        )
        return response
