#!/bin/bash

# Script to initialize the compliance_tracker database in the shared PostgreSQL
# Run this script from the infra directory where docker-compose.yml is located

set -e

echo "Initializing compliance_tracker database..."

# Get the postgres password from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found in current directory"
    exit 1
fi

# Create the database
docker exec -it infra-postgres-1 psql -U postgres -c "CREATE DATABASE compliance_tracker;" || echo "Database might already exist"

# Grant permissions
docker exec -it infra-postgres-1 psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE compliance_tracker TO postgres;"

echo "✅ Database compliance_tracker created successfully!"
echo ""
echo "Next steps:"
echo "1. Make sure the production_shared network exists: docker network create production_shared"
echo "2. Navigate to Compliance-Tracker directory: cd /opt/projects/Compliance-Tracker"
echo "3. Start the services: docker-compose -f docker-compose.prod.yml up -d"
echo "4. Run migrations: docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate"
echo "5. Create superuser: docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"
