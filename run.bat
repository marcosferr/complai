@echo off
echo Iniciando UNI Contratos...

REM Start the services
docker-compose up -d

REM Wait for the database to be ready
echo Waiting for database to be ready...
timeout /t 10 /nobreak > nul

REM Migrate the shared schemas
echo Migrating shared schemas...
docker-compose exec backend python manage.py migrate_schemas --shared

REM Create a tenant and user
echo Setting up tenant and user...
docker-compose exec backend python scripts/setup_tenant.py

REM Show the URLs
echo Services are running at:
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:8000/api
echo   Admin: http://localhost:8000/admin
echo.
echo You can login with:
echo   Email: admin@ejemplo.com
echo   Password: admin123
echo.
echo To view logs: docker-compose logs -f
echo To stop: docker-compose down
pause