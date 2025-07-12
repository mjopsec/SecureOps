#!/bin/sh
# Docker entrypoint script untuk backend

set -e

echo "Starting SecureOps Backend..."

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "postgres" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up!"

# Check if database exists
if PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Database $DB_NAME already exists"
else
    echo "Creating database $DB_NAME..."
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE $DB_NAME;"
fi

# Run migrations
echo "Running migrations..."
for migration in /app/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Applying migration: $(basename $migration)"
        PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$migration" || true
    fi
done

# Check if admin user exists and has correct password
echo "Checking admin user..."
node /app/scripts/fix-admin-password.js

echo "Database initialization complete!"

# Start the application
exec "$@"