# TODO: Fix Dashboard Network Errors

## Problem
- ERR_BLOCKED_BY_CLIENT for API calls to /api/dashboard/stats and /api/activity-logs
- Inconsistent API URL configuration between local development and Docker

## Steps
- [x] Update api.ts fallback API_URL to 'http://localhost:3000/api'
- [x] Update DocumentsList.tsx upload URL fallback to 'http://localhost:3000/api'
- [ ] Update .env.local NEXT_PUBLIC_API_URL to 'http://localhost:3000/api' for local development
- [ ] Disable browser extensions (ad blockers) that block localhost requests
- [ ] Ensure backend is running on localhost:3000
- [ ] Alternatively, run docker-compose up to use nginx proxy on localhost:80 with NEXT_PUBLIC_API_URL=http://localhost/api

# TODO: Fix Production API URLs

## Problem
- Frontend uses full URLs for API calls, causing issues in production with nginx proxy
- Need to use relative URLs for proper proxying

## Steps
- [x] Update web-frontend/lib/api.ts: Change default API_URL to '/api'
- [x] Update docker-compose.yml: Set NEXT_PUBLIC_API_URL=/api for web-frontend, remove from api-backend
- [x] Update NextAuth authorize to use INTERNAL_API_URL for server-side API calls
- [x] Add INTERNAL_API_URL=http://api-backend:3000/api to docker-compose web-frontend environment
- [x] Rebuild and redeploy containers (user will handle)

# TODO: Fix Automatic Disconnection Issue

## Problem
Users are being disconnected automatically, likely due to NextAuth session cookies not persisting correctly with the nginx proxy setup.

## Steps
- [x] Update NextAuth configuration to include cookies settings with proper domain and security options.
- [x] Add updateAge to session configuration for periodic JWT refresh.
- [ ] Rebuild and redeploy containers (user will handle).
- [ ] Test the authentication persistence.

## Files to Edit
- web-frontend/app/api/auth/[...nextauth]/route.ts
