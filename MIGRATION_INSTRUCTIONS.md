# Database Migration Instructions

## Problem
The database is missing `latitude` and `longitude` columns in the `drivers` table.

## Solution

### Option 1: Quick Fix (Recommended)
Recreate the database with the correct schema:

```bash
# Stop all services
docker-compose down

# Remove the database volume to start fresh
docker volume rm mini_uber_postgres_data

# Start services again (database will be recreated with correct schema)
docker-compose up --build
```

### Option 2: Manual Migration (If you want to keep existing data)
If you have important data and want to keep it:

```bash
# Start only the database
docker-compose up -d postgres

# Wait 5 seconds for database to be ready
timeout /t 5

# Run the migration
docker exec -i mini_uber-postgres-1 psql -U paras -d uberdb -c "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS latitude FLOAT; ALTER TABLE drivers ADD COLUMN IF NOT EXISTS longitude FLOAT;"

# Start all services
docker-compose up -d
```

## Verification
After migration, check if columns exist:

```bash
docker exec -i mini_uber-postgres-1 psql -U paras -d uberdb -c "\d drivers"
```

You should see `latitude` and `longitude` columns in the output.
