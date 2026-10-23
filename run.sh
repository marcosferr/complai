#!/bin/bash

echo "Iniciando UNI Contratos..."

# Start the services
docker-compose up -d

# Wait for the database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Migrate the shared schemas
echo "Migrating shared schemas..."
docker-compose exec -T backend python manage.py migrate_schemas --shared

# Create a tenant and user
echo "Setting up tenant and user..."
docker-compose exec -T backend python scripts/setup_tenant.py

# Show the URLs
echo "Services are running at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8000/api"
echo "  Admin: http://localhost:8000/admin"
echo ""
echo "You can login with:"
echo "  Email: admin@ejemplo.com"
echo "  Password: admin123"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"