#!/bin/bash
set -u
# =============================================================================
# Script de Restauración de Base de Datos - Compliance Tracker
# =============================================================================
# Uso: ./restore_backup.sh [archivo_backup]
# Si no se especifica archivo, usa backup.dump por defecto
# =============================================================================

BACKUP_FILE="${1:-backup.dump}"

# Configuración de la base de datos.
# Las credenciales NO se versionan (ISO 27001 A.5.33): vienen del entorno o de
# backend/.env.production, que está fuera de git. Exportalas antes de correr:
#   set -a; . ./backend/.env.production; set +a; ./backend/restore_backup.sh
DB_NAME="${DB_NAME:-compliance_tracker}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

if [ -z "${DB_PASSWORD:-}" ]; then
    echo "ERROR: falta DB_PASSWORD en el entorno." >&2
    echo "       Cargá backend/.env.production o exportá la variable a mano." >&2
    exit 1
fi

echo "=============================================="
echo "  Restauración de Base de Datos"
echo "  Compliance Tracker"
echo "=============================================="
echo ""

# Verificar que el archivo de backup existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: No se encontró el archivo de backup: $BACKUP_FILE"
    exit 1
fi

echo "Archivo de backup: $BACKUP_FILE"
echo "Base de datos destino: $DB_NAME"
echo ""

# Preguntar confirmación
read -p "¿Desea continuar con la restauración? (s/n): " confirm
if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "Restauración cancelada."
    exit 0
fi

echo ""
echo "Iniciando restauración..."

# Exportar password para evitar prompt
export PGPASSWORD="$DB_PASSWORD"

# Opción 1: Si estás usando Docker Compose
if command -v docker &> /dev/null; then
    echo "Detectado Docker, usando docker compose..."
    
    # Copiar backup al contenedor
    docker cp "$BACKUP_FILE" $(docker compose ps -q db):/tmp/backup.dump
    
    # Terminar conexiones existentes
    docker compose exec -T db psql -U "$DB_USER" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null
    
    # Eliminar y recrear la base de datos
    docker compose exec -T db psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
    docker compose exec -T db psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    
    # Restaurar el backup
    docker compose exec -T db pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl /tmp/backup.dump
    
    # Limpiar
    docker compose exec -T db rm /tmp/backup.dump
    
else
    # Opción 2: PostgreSQL instalado localmente
    echo "Usando PostgreSQL local..."
    
    # Terminar conexiones existentes
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null
    
    # Eliminar y recrear la base de datos
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    
    # Restaurar el backup
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl "$BACKUP_FILE"
fi

# Limpiar variable de entorno
unset PGPASSWORD

echo ""
echo "=============================================="
echo "  Restauración completada!"
echo "=============================================="
echo ""
echo "Base restaurada:"
echo "  Host: $DB_HOST"
echo "  Puerto: $DB_PORT"
echo "  Base de datos: $DB_NAME"
echo "  Usuario: $DB_USER"
echo ""
