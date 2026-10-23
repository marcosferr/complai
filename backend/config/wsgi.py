"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os
from pathlib import Path

from django.core.wsgi import get_wsgi_application

try:
	from dotenv import load_dotenv
except Exception:
	load_dotenv = None


if load_dotenv:
	env_path = Path(__file__).resolve().parents[1] / '.env'
	load_dotenv(env_path)

# Default to development settings when not provided (local convenience)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

application = get_wsgi_application()
