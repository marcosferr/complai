#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

# Use python-dotenv to load .env files for development convenience.
try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


def main():
    """Run administrative tasks."""
    # Load `.env` (if python-dotenv is available). This allows running
    # `python manage.py` locally without exporting environment variables.
    if load_dotenv:
        base_dir = Path(__file__).resolve().parent
        load_dotenv(base_dir / '.env')

    # Default to development settings when DJANGO_SETTINGS_MODULE is not set.
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
