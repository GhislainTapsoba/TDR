#!/bin/bash

# Script pour configurer Let's Encrypt SSL
echo "Configuration SSL avec Let's Encrypt..."

# Arrêter les services
docker-compose down

# Installer certbot si nécessaire
if ! command -v certbot &> /dev/null; then
    echo "Installation de certbot..."
    apt-get update
    apt-get install -y certbot
fi

# Générer les certificats Let's Encrypt
echo "Génération des certificats SSL..."
certbot certonly --standalone \
    --email admin@deep-technologies.com \
    --agree-tos \
    --no-eff-email \
    -d teamproject.deep-technologies.com

# Copier les certificats
echo "Copie des certificats..."
mkdir -p ./certs
cp /etc/letsencrypt/live/teamproject.deep-technologies.com/fullchain.pem ./certs/cert.pem
cp /etc/letsencrypt/live/teamproject.deep-technologies.com/privkey.pem ./certs/key.pem

# Définir les permissions
chmod 644 ./certs/cert.pem
chmod 600 ./certs/key.pem

echo "Certificats SSL configurés avec succès !"
echo "Redémarrage des services..."

# Redémarrer les services
docker-compose up -d

echo "Configuration SSL terminée !"