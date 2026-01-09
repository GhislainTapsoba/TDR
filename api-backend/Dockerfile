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

# Variables d'environnement pour le build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder-service-key

# Build Next.js with environment variables from .env if it exists
RUN /bin/bash -c "if [ -f .env ]; then set -a && source .env && set +a && npm run build; else npm run build; fi"

# -------------------------------
# Stage 2 : Runner (production)
# -------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Créer utilisateur non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copier les fichiers de configuration
COPY --from=builder --chown=nextjs:nodejs /app/next.config.* ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copier le build Next.js et les node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copier les fichiers publics si ils existent
COPY --from=builder --chown=nextjs:nodejs /app/public* ./public

USER nextjs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"

# Utiliser next start au lieu de node
CMD ["npm", "start"]