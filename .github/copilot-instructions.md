# Compliance Tracker - AI Coding Agent Instructions

## Project Overview
Compliance tracking system with Django backend, React (Vite) frontend, and AI-powered document processing using OpenAI GPT-4o-mini.

## Architecture Essentials

### Custom User Model
- Model: `apps.authentication.Usuario` (not Django's User)
- Roles: `ADMIN`, `DIRECTOR` (Manager), `RESPONSABLE` (Responsible)
- Users linked to `Area` (department) - required for non-admin roles

### Database
- PostgreSQL database
- Single database instance with standard Django models

## Development Workflows

### Starting Development Environment
**Windows**: `run.bat` | **Linux/macOS**: `./run.sh`
Or manually with Docker Compose:
```bash
docker-compose up -d
sleep 10  # Wait for DB
docker-compose exec backend python manage.py migrate
```

**Without Docker (backend)**:
```bash
cd backend
python manage.py runserver  # Dev server
celery -A config worker -l info  # Background tasks
celery -A config beat -l info  # Scheduled tasks
```

**Frontend**:
```bash
cd frontend
npm run dev  # Starts on port 3000 (proxies to backend:8000)
```

### Key Commands
- **Create migration**: `python manage.py makemigrations <app_name>`
- **Apply migrations**: `python manage.py migrate`
- **Create superuser**: `python manage.py createsuperuser`

## Document Processing Pipeline

### AI Integration (apps/documentos/tasks.py)
1. **Text Extraction**: PyPDF2 (fast) → OCR fallback with Tesseract/pdf2image if native extraction fails
2. **AI Analysis**: OpenAI GPT-4o-mini with **Pydantic structured outputs** (see `backend/apps/documentos/schemas.py`)
3. **Celery Task**: `@shared_task` decorated `process_document_with_ai(document_id)`
   - Task sets `estado_procesamiento_ia`: PENDIENTE → PROCESANDO → COMPLETADO/ERROR
   - Stores extracted data in `clausulas_extraidas_ia` (JSON field)

### Processing States
- Check `DocumentoLegal.estado_procesamiento_ia` before reprocessing
- Frontend polls every 5s during PROCESANDO state
- Use `/api/documentos/{id}/reprocess/` endpoint to trigger

## API Patterns

### Authentication
- JWT tokens via `rest_framework_simplejwt`
- Access token in `Authorization: Bearer <token>` header
- Refresh via `/api/auth/refresh/` (see `frontend/src/services/api.js` interceptor)

### ViewSets & Permissions
- Use `viewsets.ModelViewSet` with role-based filtering in `get_queryset()`
- Example: `apps/tareas/views.py` - DIRECTOR sees only their area, RESPONSABLE sees only assigned tasks

### Serializer Pattern
- Separate create/update serializers: e.g., `TareaCreateSerializer` vs `TareaCumplimientoSerializer`
- Use `select_related()` and `prefetch_related()` in queryset for performance
- Return detailed serializer in create response (not the input serializer)

## Frontend Architecture

### State Management (Redux Toolkit)
- Store: `frontend/src/store/index.js` - centralizes all slices
- Slices for: auth, documentos, clausulas, tareas, auditorias, calendario, notificaciones, ui, users
- Use `useSelector` for state, `useDispatch` for actions

### API Service Layer
- Axios instance in `frontend/src/services/api.js` handles:
  - Auto-retry with token refresh on 401
  - Bearer token injection
  - Base URL from `VITE_API_URL` env var
- Module pattern: `documentService.js`, `clausulaService.js`, etc.

### Spanish Language
- All UI text in Spanish (es)
- Backend: `LANGUAGE_CODE = 'es'`, `TIME_ZONE = 'America/Asuncion'`
- Model field labels use `verbose_name` in Spanish

## Model Relationships

### Core Entities
- **DocumentoLegal** (contracts, policies) → **Clausula** (clauses) → **TareaCumplimiento** (tasks)
- **Clausula** → **ClausulaRelacionada** (m2m relationships: REFERENCIA, MODIFICACION, DEPENDENCIA, etc.)
- **Clausula** → **Adenda** (amendments/changes tracking)
- Documents can have parent-child via `documento_padre_id` (for addendums)

### Task Management
- **TareaCumplimiento**: Links clause to area/responsables with checklist items
- **Area** (department) → multiple **Usuario** → multiple **TareaCumplimiento**
- States: PENDIENTE → EN_PROGRESO → COMPLETADO/VENCIDO

## Testing & Debugging

### Backend Testing
- Test files in `backend/apps/<app>/tests.py`
- Use Django test client
- See `TESTING_GUIDE.md` for endpoints and expected responses

### Frontend Testing
- Manual workflow tests in `TESTING_GUIDE.md`
- Verify API calls match backend serializer structure
- Check Redux DevTools for state changes

## Common Pitfalls

1. **Celery Tasks**: Background tasks for document processing
2. **Migrations**: Use standard Django migrations with `python manage.py migrate`
3. **File Uploads**: Use `document_upload_path` function for organized file storage

## Key Files Reference

- **Settings**: `backend/config/settings/base.py`
- **Main URLs**: `backend/config/urls.py`
- **Docker Compose**: `docker-compose.yml` (db, redis, backend, celery, celery-beat, frontend)
- **Frontend Routes**: `frontend/src/App.jsx` or `frontend/src/router.jsx`
- **API Config**: `frontend/src/services/api.js` (interceptors, token refresh)

## Documentation
- Architecture deep-dive: `ARCHITECTURE.md`
- Project structure: `PROJECT_STRUCTURE.md`
- AI processing details: `AI_DOCUMENT_PROCESSING_GUIDE.md`
- Deployment: `DEPLOYMENT_GUIDE.md`
- Implementation guides: `IMPLEMENTATION_GUIDE.md`, various feature-specific guides


## DEBUG Data
User and password 
admin@compliance.com  
admin123
Frontend  at
localhost:3000

Backend at
localhost:8000