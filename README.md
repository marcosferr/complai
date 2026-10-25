# UNI Contratos — Seguimiento inteligente de contratos

White label de *Compliance Tracker* adaptado a la **Universidad Nacional de Itapúa (UNI)**
para la Hackatón SOPAIA (23/10/2026). Toma un contrato cargado al sistema y lo
convierte en una herramienta de seguimiento: cláusulas, obligaciones de las partes,
plazos, entregables, responsables, evidencias y alertas.

> El contrato de `backend/demo/contrato_uni_ejemplo.json` es **ficticio** y se incluye solo
> para la demostración.

## Cómo se relaciona con los desafíos de la hackatón

| Desafío | Qué aporta esta base |
|---|---|
| **1. Asistente para administración y seguimiento de contratos** | Carga de contratos (PDF) con extracción de cláusulas por IA, obligaciones como tareas con vencimiento, responsables y prioridad, dashboard con vencidas / próximas a vencer, notificaciones programables y nivel de riesgo (impacto × probabilidad). |
| **2. Entrenador de administradores de contratos** | Las cláusulas y obligaciones quedan estructuradas por contrato: es la base de conocimiento sobre la que se puede montar el tutor conversacional (RAG). |
| **6. Historial de proveedores** | Historial de estados, comentarios, archivos de respaldo y auditorías por obligación, reutilizables como "historia clínica" del proveedor. |
| **8. IA UNI local** | El procesamiento de IA está aislado en `backend/apps/documentos/tasks.py` y se puede apuntar a un modelo open source servido localmente. |

## Flujo de aprobación (universidad pública)

| # | Etapa | Quién actúa | Qué hace |
|---|---|---|---|
| 1 | **Inicio** | Responsable Técnico (p. ej. fiscal de obras, técnico de la unidad requirente) | Ejecuta y carga la evidencia de la obligación. |
| 2 | **Revisión de la Dirección** | Director/a de Dependencia (Decano/a o Director/a) | Da el visto bueno u observa lo presentado por su dependencia. |
| 3 | **Control de la UOC** | Analista de Contratos (Unidad Operativa de Contrataciones) | Controla el cumplimiento técnico y documental. |
| 4 | **Control del Administrador** | Administrador/a de Contrato (designado/a por resolución) | Valida, emite el dictamen y, si corresponde, remite al **Rectorado**. |
| — | **Rectorado** | Máxima autoridad (Ley 7021/2022, art. 67) | Aprueba, observa o rechaza (p. ej. convenios modificatorios). |

Cada etapa puede devolver la obligación a la anterior con observaciones.

Códigos internos: roles `RESPONSABLE`, `DIRECTOR`, `ANALISTA_UOC`, `ADMINISTRADOR_CONTRATO`; etapas
`INICIO`, `REVISION_DIRECCION`, `CONTROL_UOC`, `CONTROL_ADMINISTRADOR`. Las etiquetas viven en
`frontend/src/lib/estadoEtapaConstants.js` y en los `choices` de `backend/apps/authentication/models.py`
y `backend/apps/tareas/models.py`.

## Inicio rápido

Requisitos: Docker y Docker Compose.

```bash
./run.sh          # Linux/macOS
run.bat           # Windows
```

O manualmente:

```bash
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

- Frontend: http://localhost:3000
- API: http://localhost:8000/api
- Admin de Django: http://localhost:8000/admin

### Cargar el contrato de demostración

1. Crear un documento (contrato) desde la interfaz y anotar su ID.
2. Importar cláusulas y obligaciones:

```bash
docker-compose exec backend python manage.py import_contrato \
  --file demo/contrato_uni_ejemplo.json \
  --document-id <ID> --responsable-username <usuario>
```

Cada obligación acepta `dias_plazo` y `prioridad` (`BAJA`, `MEDIA`, `ALTA`, `CRITICA`),
así el tablero muestra desde el primer momento obligaciones en distintos estados.
El formato está tipado en `types/contrato.ts`.

### IA

Para extraer cláusulas automáticamente de un PDF, en `backend/.env`:

```
ENABLE_AI_PROCESSING=true
OPENAI_API_KEY=...
```

## Desarrollo local

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements/base.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
npx vitest run     # tests unitarios
```

## Branding (white label)

Todo lo que identifica a la institución está concentrado en tres lugares:

- `frontend/src/config/brand.js` — nombre del sistema, institución, logo, sitio web.
- `frontend/tailwind.config.js` — paleta UNI: bordó `#AE152D`, ladrillo `#CC6633`,
  dorado `#C8860A`, crema `#FBF3E4`; tipografía Poppins (la de uni.edu.py).
- `frontend/public/assets/` — `logo-uni.png`, `sistema.ico`, `sistema.svg`.

Para otra institución basta con cambiar esos archivos.

## Estructura

```
backend/            Django + DRF
  apps/documentos   Contratos, versiones, adendas, extracción con IA
  apps/clausulas    Cláusulas y su historial
  apps/tareas       Obligaciones, etapas, evidencias, riesgo
  apps/auditorias   Auditorías
  apps/notificaciones  Alertas internas y por correo
  apps/dashboard    Indicadores
frontend/           React + Vite + Redux Toolkit + Tailwind
backend/demo/       Contrato ficticio para la demo
types/              Formato de importación de contratos
```

## Tecnologías

Django 4.2, Django REST Framework, PostgreSQL, Redis, Celery, React 18, Vite,
Redux Toolkit, Tailwind CSS.

## Licencia

MIT.
