@echo off
REM Script para generar y aplicar migraciones de Clausulas y Tareas (Windows)

echo ===================================
echo Generando migraciones...
echo ===================================

cd backend

REM Crear migraciones para clausulas
echo Creando migraciones para clausulas...
python manage.py makemigrations clausulas

REM Crear migraciones para tareas
echo Creando migraciones para tareas...
python manage.py makemigrations tareas

echo.
echo ===================================
echo Aplicando migraciones...
echo ===================================

REM Aplicar migraciones
python manage.py migrate

echo.
echo ===================================
echo Migraciones completadas!
echo ===================================
echo.
echo Para verificar las migraciones ejecutadas:
echo python manage.py showmigrations

pause
