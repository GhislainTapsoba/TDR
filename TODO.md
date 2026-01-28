# TODO: Sécuriser l'application HTTPS

## Prérequis
- [ ] Accès SSH à votre VPS
- [ ] Domaine `teamproject.deep-technologies.com` pointant vers l'IP de votre VPS
- [ ] Ports 80 et 443 ouverts dans le firewall

## Étape 1: Vérifications initiales
- [ ] Se connecter au VPS via SSH
- [ ] Vérifier que Docker et Docker Compose sont installés
- [ ] Vérifier l'état actuel des conteneurs: `docker ps`
- [ ] Vérifier les logs nginx: `docker logs nginx`

## Étape 2: Installation de Certbot
- [ ] Mettre à jour le système: `sudo apt update && sudo apt upgrade -y`
- [ ] Installer Certbot: `sudo apt install certbot -y`
- [ ] Vérifier l'installation: `certbot --version`

## Étape 3: Obtenir les certificats Let's Encrypt
- [ ] Arrêter temporairement nginx si nécessaire: `docker-compose stop nginx`
- [ ] Obtenir le certificat: `sudo certbot certonly --standalone -d teamproject.deep-technologies.com`
- [ ] Vérifier que les certificats ont été créés: `ls -la /etc/letsencrypt/live/teamproject.deep-technologies.com/`

## Étape 4: Copier les certificats dans le projet
- [ ] Localiser le dossier de votre projet sur le VPS
- [ ] Copier fullchain.pem: `sudo cp /etc/letsencrypt/live/teamproject.deep-technologies.com/fullchain.pem ./certs/`
- [ ] Copier privkey.pem: `sudo cp /etc/letsencrypt/live/teamproject.deep-technologies.com/privkey.pem ./certs/`
- [ ] Définir les permissions correctes:
  - `sudo chmod 644 ./certs/fullchain.pem`
  - `sudo chmod 600 ./certs/privkey.pem`

## Étape 5: Redémarrer l'application
- [ ] Redémarrer tous les conteneurs: `docker-compose down && docker-compose up -d`
- [ ] Vérifier que tous les conteneurs démarrent: `docker ps`
- [ ] Vérifier les logs nginx: `docker logs nginx`

## Étape 6: Tests et validation
- [ ] Tester l'accès HTTPS: ouvrir `https://teamproject.deep-technologies.com` dans un navigateur
- [ ] Vérifier que le cadenas est vert (pas d'avertissement de sécurité)
- [ ] Tester les fonctionnalités de l'application (login, navigation, etc.)
- [ ] Vérifier les logs pour s'assurer qu'il n'y a pas d'erreurs SSL

## Étape 7: Configuration du renouvellement automatique
- [ ] Ajouter une tâche cron pour le renouvellement automatique:
  - `sudo crontab -e`
  - Ajouter: `0 2 * * 1 certbot renew --quiet && docker-compose restart nginx`
- [ ] Tester le renouvellement: `sudo certbot renew --dry-run`

## Dépannage (si nécessaire)
- [ ] Si port 80 bloqué: vérifier le firewall `sudo ufw status`
- [ ] Si domaine ne pointe pas: vérifier les DNS
- [ ] Si erreur SSL: vérifier les permissions des fichiers de certificats
- [ ] Si conteneurs ne démarrent pas: vérifier les logs détaillés `docker logs -f [container_name]`

## Notes importantes
- Les certificats Let's Encrypt sont valides 90 jours
- Le renouvellement automatique est configuré pour tous les lundis à 2h du matin
- Ne jamais partager les fichiers de clés privées
- Sauvegardez régulièrement vos certificats
