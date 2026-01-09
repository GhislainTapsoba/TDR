# TDR Projects - API Backend

API Backend Next.js pour la plateforme de gestion de projets avec notifications automatiques par email.

## Installation

```bash
npm install
npx prisma generate
npm run dev
```

## Variables d'environnement (.env)

```env
DATABASE_URL="postgresql://username:password@localhost:5432/tdr_db?schema=public"
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001

MAILJET_API_KEY=your-mailjet-api-key
MAILJET_SECRET_KEY=your-mailjet-secret-key
MAIL_FROM_EMAIL=your-email@domain.com
MAIL_FROM_NAME=TDR Projects

NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## API Endpoints

- `GET /api/dashboard` - KPIs et statistiques
- `GET/POST/PATCH/DELETE /api/projects` - CRUD projets
- `GET/POST/PATCH/DELETE /api/tasks` - CRUD tâches
- `GET/POST/PATCH/DELETE /api/notifications` - Gestion notifications

## Docker

```bash
# Build et démarrage
docker-compose up -d --build

# Arrêt
docker-compose down
```

## Technologies

- Next.js 16 (App Router)
- PostgreSQL + Supabase
- NextAuth.js
- Mailjet (emails)
- TypeScript

## Structure

```
api-backend/
├── app/api/          # Routes API
├── lib/              # Services (email, auth, etc.)
├── prisma/           # Schéma DB
├── Dockerfile        # Image Docker
├── docker-compose.yml # Orchestration
└── nginx.conf        # Reverse proxy
```