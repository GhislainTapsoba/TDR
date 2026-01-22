# TODO: Migration HTTP vers HTTPS

## Étapes à suivre

- [x] Créer un répertoire pour les certificats SSL (certs/)
- [x] Générer des certificats auto-signés (Let's Encrypt ne supporte pas les IPs)
- [x] Mettre à jour nginx.conf pour configurer HTTPS sur le port 443 et redirection HTTP vers HTTPS
- [x] Mettre à jour docker-compose.yml pour exposer le port 443 et changer les URLs en HTTPS
- [x] Redémarrer les services Docker
- [x] Tester l'accès HTTPS et vérifier que HTTP redirige vers HTTPS
