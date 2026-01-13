# Fix Authentication 401 Error

## Problem
- Nginx proxies /api/ to backend, so /api/auth/ requests go to backend's broken NextAuth instead of frontend's.
- Backend's NextAuth uses undefined NEXT_PUBLIC_API_URL, causing authorize to fail.
- This leads to 401 on callback.

## Steps
- [x] Modify nginx.conf to proxy /api/auth/ to web-frontend:3001
- [x] Remove backend's NextAuth routes (api-backend/app/api/auth/[...nextauth]/route.ts and api-backend/app/api/[...nextauth]/route.ts)
- [x] Update frontend's NextAuth to use process.env.INTERNAL_API_URL for backend calls
- [ ] Rebuild and redeploy containers
