# Stage de build
FROM node:20-alpine AS builder

WORKDIR /app

# Installer dépendances système pour certains modules natifs
RUN apk add --no-cache libc6-compat python3 make g++

# Copier les fichiers de dépendances
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Installer dépendances selon le lockfile
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Copier le code
COPY . .

# Build Next.js
RUN if [ -f yarn.lock ]; then yarn build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Stage de production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Créer utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier les fichiers nécessaires depuis le builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./  # si build standalone
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Dossier .next pour cache
RUN mkdir -p .next && chown nextjs:nodejs .next

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
