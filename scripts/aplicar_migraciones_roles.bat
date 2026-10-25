@echo off
REM Script para aplicar migraciones del sistema de roles y etapas (Windows)

echo ================================================
echo    Sistema de Roles y Estados por Etapa
echo    Aplicacion de Migraciones
echo ================================================
echo.

cd /d "%~dp0..\backend"

echo [1/5] Verificando estado de migraciones...
python manage.py showmigrations authentication tareas
echo.

echo [2/5] Aplicando migraciones compartidas (authentication)...
python manage.py migrate_schemas --shared
if errorlevel 1 goto error
echo.

echo [3/5] Aplicando migraciones de tenants (tareas)...
python manage.py migrate_schemas
if errorlevel 1 goto error
echo.

echo [4/5] Verificando conversion de roles...
python manage.py shell < ..\scripts\check_roles.py
if errorlevel 1 goto error
echo.

echo [5/5] Verificando etapas de tareas...
python manage.py shell < ..\scripts\check_etapas.py
if errorlevel 1 goto error
echo.

echo ================================================
echo    Migraciones aplicadas exitosamente
echo ================================================
echo.
echo Notas importantes:
echo   - Todos los usuarios ADMIN ahora son ADMINISTRADOR_CONTRATO
echo   - Las tareas existentes tienen etapas asignadas
echo   - El backend esta listo para usar
echo   - El frontend requiere actualizacion
echo.
echo Documentacion:
echo   - RESUMEN_SISTEMA_ROLES_ETAPAS.md
echo   - SISTEMA_ROLES_ETAPAS_IMPLEMENTACION.md
echo   - FLUJO_COMPLIANCE_DIAGRAMA.md
echo.
goto end

:error
echo.
echo ERROR: Hubo un problema al aplicar las migraciones
echo Por favor revisa los mensajes de error arriba
exit /b 1

:end
pause
