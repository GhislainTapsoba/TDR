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

# Arguments de build (passés depuis docker-compose ou ligne de commande)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_FRONTEND_URL

# Définir les variables d'environnement pour le build Next.js
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL

# Build Next.js
RUN npm run build

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