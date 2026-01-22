# TODO: Migration HTTP vers HTTPS

## Étapes à suivre

- [x] Créer un répertoire pour les certificats SSL (certs/)
- [ ] Installer Certbot sur l'hôte pour obtenir les certificats Let's Encrypt
- [ ] Exécuter Certbot pour obtenir le certificat pour 194.195.211.111
- [x] Mettre à jour nginx.conf pour configurer HTTPS sur le port 443 et redirection HTTP vers HTTPS
- [x] Mettre à jour docker-compose.yml pour exposer le port 443 et changer les URLs en HTTPS
- [ ] Redémarrer les services Docker
- [ ] Tester l'accès HTTPS et vérifier que HTTP redirige vers HTTPS
