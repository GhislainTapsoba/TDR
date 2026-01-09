# -------------------------------
# Stage 1 : Build
# -------------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Installer les dépendances système pour compiler certains modules Node
RUN apk add --no-cache libc6-compat python3 make g++

# Copier package.json et lockfile
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Installer dépendances selon le lockfile présent
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Copier le reste du code
COPY . .

# Build Next.js
RUN if [ -f yarn.lock ]; then yarn build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
    else echo "Lockfile not found." && exit 1; \
    fi

# -------------------------------
# Stage 2 : Production
# -------------------------------
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Créer utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier fichiers nécessaires depuis builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./  # si next build --standalone
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Créer dossier .next pour cache
RUN mkdir -p .next && chown nextjs:nodejs .next

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
