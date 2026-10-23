#!/bin/bash
# Script to create the compliance_tracker database in the shared PostgreSQL instance

set -e

echo "Creating compliance_tracker database..."

# Database connection details
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="supersecurepasswordthistimexd123"
DB_NAME="compliance_tracker"

# Create database if it doesn't exist
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -c "CREATE DATABASE $DB_NAME"

echo "Database '$DB_NAME' is ready!"

# Optional: Create extensions if needed
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"

echo "Extensions created successfully!"
echo ""
echo "You can now start the Compliance Tracker services with:"
echo "cd /opt/projects/Compliance-Tracker && docker-compose -f docker-compose.prod.yml up -d"
