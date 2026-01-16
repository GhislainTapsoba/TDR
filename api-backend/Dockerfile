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

# Nettoyer le cache Next.js
RUN rm -rf .next

# Variables d'environnement pour le build
ENV NEXT_TELEMETRY_DISABLED=1

# Arguments de build (passés depuis docker-compose)
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ARG MAILJET_API_KEY
ARG MAILJET_SECRET_KEY
ARG MAIL_FROM_EMAIL
ARG MAIL_FROM_NAME

# Définir les variables d'environnement pour le build Next.js
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV MAILJET_API_KEY=$MAILJET_API_KEY
ENV MAILJET_SECRET_KEY=$MAILJET_SECRET_KEY
ENV MAIL_FROM_EMAIL=$MAIL_FROM_EMAIL
ENV MAIL_FROM_NAME=$MAIL_FROM_NAME

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

# Copier les scripts pour l'init (permissions, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Copier lib pour les scripts TypeScript
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib

USER nextjs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
