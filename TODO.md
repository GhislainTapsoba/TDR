# TODO: Fix Authentication Logout Issue

## Problem
- Dual auth systems: NextAuth and custom context with localStorage
- Login uses NextAuth signIn, but context not synced
- localStorage keys mismatch: context uses 'auth_token', API uses 'token'
- Automatic logout after login due to API calls failing before localStorage is set

## Steps
- [x] Update web-frontend/contexts/auth-context.tsx to use useSession from NextAuth
- [x] Sync localStorage with NextAuth session (keys: 'token', 'user')
- [x] Update logout function to use signOut from NextAuth
- [x] Remove duplicate NextAuth routes in backend (api/auth/[...nextauth] and api/[...nextauth])
- [x] Prevent API calls in dashboard until auth context is loaded
- [x] Update docker-compose.yml to use http URLs
- [x] Fix NextAuth authorize to use internal docker URL for API calls
- [x] Extend NextAuth User type to include token
- [x] Redeploy the app with docker-compose up --build
