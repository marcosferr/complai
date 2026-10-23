"""
Django settings for config project.

This module imports the appropriate settings based on the DJANGO_SETTINGS_MODULE
environment variable. Default is 'development'.
"""

import os

# Default to development settings
settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', 'config.settings.development')

# Import the appropriate settings module
if 'production' in settings_module:
    from .settings.production import *
elif 'testing' in settings_module:
    from .settings.testing import *
else:
    from .settings.development import *
