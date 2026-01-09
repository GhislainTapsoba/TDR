# -------------------------------
# Stage 1 : Build
# -------------------------------
FROM node:18-alpine AS builder

# Créer le dossier de travail
WORKDIR /app

# Copier uniquement les fichiers de dépendances pour accélérer le cache
COPY package*.json ./

# Installer toutes les dépendances (dev + prod) pour pouvoir générer Prisma
RUN npm ci

# Copier le reste du code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Build de l'application (si tu as un build TypeScript ou Next.js)
RUN npm run build

# -------------------------------
# Stage 2 : Production
# -------------------------------
FROM node:18-alpine

WORKDIR /app

# Installer uniquement les dépendances de production
COPY package*.json ./
RUN npm ci --only=production

# Copier le build et les fichiers nécessaires depuis le builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist   # ou le dossier build de ton app
COPY --from=builder /app/package.json ./package.json

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"]
