# -------------------------------
# Stage 1 : Builder
# -------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Installer dépendances système pour modules natifs
RUN apk add --no-cache libc6-compat python3 make g++

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer dépendances
RUN npm ci

# Copier le reste du code
COPY . .

# -------------------------------
# Variables d'environnement pour Next.js build
# -------------------------------
ENV NEXT_PUBLIC_SUPABASE_URL=https://zckxtpvggtojwrpdjage.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ENV NEXTAUTH_SECRET=8f3e9d2c1b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e
ENV NEXTAUTH_URL=http://localhost:3000
ENV NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001

# Build TypeScript / Next.js
RUN npm run build

# -------------------------------
# Stage 2 : Runner (production)
# -------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Créer utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copier les fichiers construits depuis builder
COPY --from=builder /app ./

USER appuser

EXPOSE 3000

# Lancer l'API / Frontend
CMD ["node", "app/index.js"]
