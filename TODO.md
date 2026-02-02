# Downgrade Chakra UI to v2

- [x] Arrêter Docker avec `docker compose down` (Docker non démarré)
- [x] Modifier `web-frontend/package.json` pour downgrader les versions Chakra UI
- [ ] Rebuilder le conteneur web-frontend avec `docker compose build --no-cache web-frontend`
- [ ] Relancer avec `docker compose up`
- [ ] Tester que l'application fonctionne sans erreurs Chakra UI
