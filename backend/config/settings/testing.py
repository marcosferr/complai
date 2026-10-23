from decouple import config

from .base import *  # noqa

# Testing overrides
DEBUG = False
TESTING = True

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('TEST_DB_NAME', default='compliance_tracker_test'),
        'USER': config('TEST_DB_USER', default=config('DB_USER', default='postgres')),
        'PASSWORD': config('TEST_DB_PASSWORD', default=config('DB_PASSWORD', default='postgres')),
        'HOST': config('TEST_DB_HOST', default=config('DB_HOST', default='localhost')),
        'PORT': config('TEST_DB_PORT', default=config('DB_PORT', default='5432')),
    }
}

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
