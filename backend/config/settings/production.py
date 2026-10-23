from copy import deepcopy

from decouple import config
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa
from .base import (  # noqa
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_STORAGE_BUCKET_NAME,
    BASE_DIR,
    LOGGING,
)

# Security
DEBUG = False

raw_allowed_hosts = config('ALLOWED_HOSTS', default='')
ALLOWED_HOSTS = [host.strip() for host in raw_allowed_hosts.split(',') if host.strip()]

raw_csrf_origins = config('CSRF_TRUSTED_ORIGINS', default='')
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in raw_csrf_origins.split(',') if origin.strip()]

# --- Guardia de arranque -----------------------------------------------------
# ISO/IEC 27001 A.8.9 (gestión de la configuración).
#
# `base.py` le da un default a SECRET_KEY y a DB_PASSWORD para que el entorno de
# desarrollo levante sin configurar nada. En producción ese default es una clave
# pública: si el `.env.production` no llega al contenedor, la aplicación firmaría
# sesiones con un secreto que está en este repositorio, sin avisar a nadie.
# Acá se corta: mejor no arrancar que arrancar inseguro.
_faltantes = []
if config('SECRET_KEY', default='') in ('', 'django-insecure-change-me-in-production'):
    _faltantes.append('SECRET_KEY')
if not ALLOWED_HOSTS:
    _faltantes.append('ALLOWED_HOSTS')
if config('DB_PASSWORD', default='') in ('', 'postgres'):
    _faltantes.append('DB_PASSWORD')
if _faltantes:
    raise ImproperlyConfigured(
        'No se puede arrancar en producción sin: ' + ', '.join(_faltantes)
        + '. Revisá backend/.env.production en el servidor.'
    )
# -----------------------------------------------------------------------------

# Database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='compliance_tracker'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST', default='db'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# CORS configuration
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in config(
    'CORS_ALLOWED_ORIGINS',
    default='https://app.example.com',
).split(',') if origin.strip()]
CORS_ALLOW_CREDENTIALS = True

# Secure proxy headers & HTTPS redirects
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# HSTS
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Protected Media Configuration
# Delegar el envio del archivo al servidor web solo si ese proceso puede leerlo.
# Con el media en un volumen de Docker (/var/lib/docker, root:root 0710) Apache
# corre como www-data y NO puede: X-Sendfile devuelve 404. Con ambos en False,
# Django sirve el archivo directamente, que funciona con cualquier proxy.
USE_XSENDFILE = config('USE_XSENDFILE', default=False, cast=bool)
USE_X_ACCEL_REDIRECT = config('USE_X_ACCEL_REDIRECT', default=False, cast=bool)

# Static files storage (S3 by default when keys are provided)
if AWS_STORAGE_BUCKET_NAME and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
        },
        'staticfiles': {
            'BACKEND': 'storages.backends.s3boto3.S3StaticStorage',
        },
    }
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = None
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
else:
    STATIC_ROOT = BASE_DIR / 'staticfiles'

# Logging tweaks for production
LOGGING = deepcopy(LOGGING)

LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOGGING['handlers']['file'] = {
    'level': 'INFO',
    'class': 'logging.FileHandler',
    'filename': LOG_DIR / 'django.log',
    'formatter': 'verbose',
}
LOGGING['root'] = {
    'handlers': ['console', 'file'],
    'level': 'INFO',
}
LOGGING['loggers']['django'] = {
    'handlers': ['console', 'file'],
    'level': 'INFO',
    'propagate': False,
}
LOGGING['loggers']['apps'] = {
    'handlers': ['console', 'file'],
    'level': 'INFO',
    'propagate': False,
}
