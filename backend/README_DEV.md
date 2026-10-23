Local development instructions

1) Use the provided `.env` (or create one from `.env.example`) in the `backend/` folder.

2) Install Python dependencies (recommended inside a virtualenv):

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements/base.txt
```

3) If you prefer Docker Compose (recommended to match services):

```bash
docker-compose up -d
# wait for DB to be ready (10-20s)
```

4) Run migrations (django-tenants requires running shared migrations first):

```bash
# Apply shared apps migrations
python manage.py migrate_schemas --shared

# Apply tenant migrations (will run migrations on all tenant schemas)
python manage.py migrate_schemas

# Create a tenant and domain (script included)
python scripts/setup_tenant.py
```

5) Start the development server locally (defaults to development settings via manage.py):

```bash
python manage.py runserver
```

6) Common fixes if you see ALLOWED_HOSTS / DEBUG errors:

- Ensure `backend/.env` exists and contains `DJANGO_SETTINGS_MODULE=config.settings.development` or set the env var before running.
- `manage.py` and ASGI/WSGI in this repo were updated to load `backend/.env` automatically for convenience. If you still see the error, check that `DEBUG=True` and `ALLOWED_HOSTS` are present in the `.env`.

7) Docker-specific tips:

- Inside Docker containers the DB host is typically `db` (see docker-compose.yml). The provided `backend/.env` uses `DB_HOST=db` for docker-compose runs.
- To run manage.py commands inside the backend container:

```bash
# find the backend service (example name: backend)
docker-compose exec backend python manage.py migrate_schemas --shared
```

If anything fails, copy the exact error and I'll help debug further.
