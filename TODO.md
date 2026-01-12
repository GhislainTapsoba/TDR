# TODO: Fix Authentication Logout Issue

## Problem
- Dual auth systems: NextAuth and custom context with localStorage
- Login uses NextAuth signIn, but context not synced
- localStorage keys mismatch: context uses 'auth_token', API uses 'token'
- Automatic logout after login

## Steps
- [x] Update web-frontend/contexts/auth-context.tsx to use useSession from NextAuth
- [x] Sync localStorage with NextAuth session (keys: 'token', 'user')
- [x] Update logout function to use signOut from NextAuth
- [x] Remove duplicate NextAuth routes in backend (api/auth/[...nextauth] and api/[...nextauth])
- [x] Test login flow
