# Downgrade Chakra UI to v2

- [x] Arrêter Docker avec `docker compose down` (Docker non démarré)
- [x] Modifier `web-frontend/package.json` pour downgrader les versions Chakra UI et compatibilité React 18
- [x] Modifier `web-frontend/Dockerfile` pour utiliser --legacy-peer-deps
- [x] Corriger les erreurs TypeScript dans export/page.tsx et my-tasks/page-corrected.tsx et page.tsx
- [ ] Rebuilder le conteneur web-frontend avec `docker compose build --no-cache web-frontend`
- [ ] Relancer avec `docker compose up`
- [ ] Tester que l'application fonctionne sans erreurs Chakra UI
