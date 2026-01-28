# HTTPS Security Implementation TODO

- [x] Update api-backend/.env with HTTPS URLs
- [x] Update web-frontend/.env.local with HTTPS URLs
- [x] Update api-backend/next.config.ts to add experimental trustHostHeader
- [x] Update nginx.conf to add missing proxy headers and use $scheme for X-Forwarded-Proto in backend
- [x] Update web-frontend/app/api/auth/[...nextauth]/route.ts to set secure: true in cookies
- [x] Update api-backend/app/api/auth/[...nextauth]/route.ts to set secure: true in cookies
- [x] Restart Docker services to apply changes
- [ ] Test the site to ensure green lock and no mixed content
=======
# HTTPS Security Implementation TODO

- [x] Update api-backend/.env with HTTPS URLs
- [x] Update web-frontend/.env.local with HTTPS URLs
- [ ] Update api-backend/next.config.ts to add experimental trustHostHeader
- [ ] Update nginx.conf to add missing proxy headers and use $scheme for X-Forwarded-Proto in backend
- [ ] Update web-frontend/app/api/auth/[...nextauth]/route.ts to set secure: true in cookies
- [ ] Update api-backend/app/api/auth/[...nextauth]/route.ts to set secure: true in cookies
- [ ] Restart Docker services to apply changes
- [ ] Test the site to ensure green lock and no mixed content
