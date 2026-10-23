@echo off
REM Script para configurar y probar el sistema de notificaciones de actualizaciones en Windows

echo ================================================
echo Sistema de Notificaciones de Actualizaciones
echo ================================================
echo.

REM Verificar que estamos en el directorio correcto
if not exist "manage.py" (
    echo ERROR: Este script debe ejecutarse desde el directorio backend\
    exit /b 1
)

REM Paso 1: Aplicar migraciones
echo Paso 1: Aplicando migraciones...
python manage.py migrate notificaciones
if %errorlevel% neq 0 (
    echo ERROR: Error al aplicar migraciones
    exit /b 1
)
echo OK: Migraciones aplicadas correctamente
echo.

REM Paso 2: Ejecutar tests
echo Paso 2: Ejecutando tests de notificaciones...
python manage.py test apps.notificaciones.tests.ComentarioNotificationTest apps.notificaciones.tests.ArchivoNotificationTest --verbosity=2
if %errorlevel% neq 0 (
    echo ADVERTENCIA: Algunos tests fallaron - revisar resultados arriba
) else (
    echo OK: Tests ejecutados correctamente
)
echo.

REM Paso 3: Información
echo ================================================
echo OK Configuracion completada
echo ================================================
echo.
echo El sistema de notificaciones esta listo. Puedes:
echo.
echo 1. Crear un comentario en una tarea:
echo    - Todos los usuarios elegibles recibiran notificacion
echo    - El autor NO recibira su propia notificacion
echo.
echo 2. Subir un archivo a una tarea:
echo    - Todos los usuarios elegibles recibiran notificacion
echo    - El usuario que sube NO recibira su propia notificacion
echo.
echo Reglas de notificacion:
echo   - Oficial/Analista: Reciben TODAS las notificaciones
echo   - Gerente: Solo de tareas de su area
echo   - Responsable: Solo de tareas donde esta asignado
echo.
echo Para mas informacion, ver:
echo   - NOTIFICACIONES_ACTUALIZACIONES_TAREAS.md
echo   - PRUEBAS_NOTIFICACIONES_ACTUALIZACIONES.md
echo.

pause
