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

# Build TypeScript si tu as un build
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

# Lancer l'API
CMD ["node", "app/index.js"]   # <-- Remplace par ton point d'entrée exact
