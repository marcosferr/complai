#!/bin/bash

# Script para configurar y probar el sistema de notificaciones de actualizaciones

echo "================================================"
echo "Sistema de Notificaciones de Actualizaciones"
echo "================================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "manage.py" ]; then
    print_error "Error: Este script debe ejecutarse desde el directorio backend/"
    exit 1
fi

# Paso 1: Aplicar migraciones
echo "Paso 1: Aplicando migraciones..."
python manage.py migrate notificaciones
if [ $? -eq 0 ]; then
    print_success "Migraciones aplicadas correctamente"
else
    print_error "Error al aplicar migraciones"
    exit 1
fi

echo ""

# Paso 2: Ejecutar tests
echo "Paso 2: Ejecutando tests de notificaciones..."
python manage.py test apps.notificaciones.tests.ComentarioNotificationTest apps.notificaciones.tests.ArchivoNotificationTest --verbosity=2
if [ $? -eq 0 ]; then
    print_success "Tests ejecutados correctamente"
else
    print_warning "Algunos tests fallaron - revisar resultados arriba"
fi

echo ""

# Paso 3: Información
echo "================================================"
echo "✅ Configuración completada"
echo "================================================"
echo ""
echo "El sistema de notificaciones está listo. Puedes:"
echo ""
echo "1. Crear un comentario en una tarea:"
echo "   - Todos los usuarios elegibles recibirán notificación"
echo "   - El autor NO recibirá su propia notificación"
echo ""
echo "2. Subir un archivo a una tarea:"
echo "   - Todos los usuarios elegibles recibirán notificación"
echo "   - El usuario que sube NO recibirá su propia notificación"
echo ""
echo "Reglas de notificación:"
echo "  • Oficial/Analista: Reciben TODAS las notificaciones"
echo "  • Gerente: Solo de tareas de su área"
echo "  • Responsable: Solo de tareas donde está asignado"
echo ""
echo "Para más información, ver:"
echo "  - NOTIFICACIONES_ACTUALIZACIONES_TAREAS.md"
echo "  - PRUEBAS_NOTIFICACIONES_ACTUALIZACIONES.md"
echo ""
