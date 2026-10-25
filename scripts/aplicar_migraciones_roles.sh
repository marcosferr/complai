#!/bin/bash
# Script para aplicar migraciones del sistema de roles y etapas

echo "================================================"
echo "   Sistema de Roles y Estados por Etapa"
echo "   Aplicación de Migraciones"
echo "================================================"
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para mostrar estado
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ ERROR${NC}"
        exit 1
    fi
}

# Cambiar al directorio del backend
cd "$(dirname "$0")"/../backend || exit 1

echo -e "${BLUE}[1/5] Verificando estado de migraciones...${NC}"
python manage.py showmigrations authentication tareas
echo ""

echo -e "${BLUE}[2/5] Aplicando migraciones compartidas (authentication)...${NC}"
python manage.py migrate_schemas --shared
check_status
echo ""

echo -e "${BLUE}[3/5] Aplicando migraciones de tenants (tareas)...${NC}"
python manage.py migrate_schemas
check_status
echo ""

echo -e "${BLUE}[4/5] Verificando conversión de roles...${NC}"
python manage.py shell << EOF
from apps.authentication.models import Usuario
print("\nEstadísticas de usuarios por rol:")
print("=====================================")
for role, label in Usuario.ROLE_CHOICES:
    count = Usuario.objects.filter(role=role).count()
    print(f"{label}: {count} usuarios")
print("")
EOF
check_status
echo ""

echo -e "${BLUE}[5/5] Verificando etapas de tareas...${NC}"
python manage.py shell << EOF
from apps.tareas.models import TareaCumplimiento
print("\nEstadísticas de tareas por etapa:")
print("===================================")
for etapa, label in TareaCumplimiento.ETAPA_CHOICES:
    count = TareaCumplimiento.objects.filter(etapa_actual=etapa).count()
    print(f"{label}: {count} tareas")
print("")
EOF
check_status
echo ""

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   ✓ Migraciones aplicadas exitosamente${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Notas importantes:${NC}"
echo "  • Todos los usuarios ADMIN ahora son ADMINISTRADOR_CONTRATO"
echo "  • Las tareas existentes tienen etapas asignadas"
echo "  • El backend está listo para usar"
echo "  • El frontend requiere actualización"
echo ""
echo -e "${BLUE}Documentación:${NC}"
echo "  • RESUMEN_SISTEMA_ROLES_ETAPAS.md"
echo "  • SISTEMA_ROLES_ETAPAS_IMPLEMENTACION.md"
echo "  • FLUJO_COMPLIANCE_DIAGRAMA.md"
echo ""
