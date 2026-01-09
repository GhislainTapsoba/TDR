# Fix Docker Build Error for api-backend

## Problem
The Docker build for api-backend was failing with "Error: Missing env.NEXT_PUBLIC_SUPABASE_URL" during the npm run build step.

## Root Cause
The lib/supabase.ts file was throwing an error if NEXT_PUBLIC_SUPABASE_URL was not set, and during build time, the .env file might not have the required environment variables.

## Solution
1. Modified api-backend/Dockerfile to set default placeholder values for Supabase environment variables during build.
2. Updated api-backend/lib/supabase.ts to use fallback values instead of throwing errors, similar to web-frontend.

## Changes Made
- Added ENV lines in Dockerfile for NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY with placeholder values.
- Changed lib/supabase.ts to use const variables with fallbacks and console warnings instead of throwing errors.

## Next Steps
- Test the Docker build: `docker-compose build api-backend`
- If build succeeds, the application will use placeholder values if real env vars are not provided.
- Ensure .env file has the correct Supabase credentials for production use.

# Add Database to Docker Compose

## Changes Made
- Added PostgreSQL database service to docker-compose.yml
- Configured database with name 'tdr_db', user 'postgres', password 'postgres'
- Added volume for data persistence
- Mounted schema_supabase.sql to auto-initialize database on first run
- Updated service dependencies to ensure database starts before other services

## Next Steps
- Test docker-compose up to start all services including database
- Verify database connection and schema initialization
- Update environment variables if needed to connect to local database
- Note: For full Supabase functionality locally, may need additional Supabase services (auth, rest API, etc.)
