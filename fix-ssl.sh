#!/bin/bash

# Arrêter nginx temporairement
docker-compose stop nginx

# Générer le certificat Let's Encrypt
sudo certbot certonly --standalone \
  -d teamproject.deep-technologies.com \
  --email admin@deep-technologies.com \
  --agree-tos \
  --non-interactive

# Copier les nouveaux certificats
sudo cp /etc/letsencrypt/live/teamproject.deep-technologies.com/fullchain.pem ./certs/cert.pem
sudo cp /etc/letsencrypt/live/teamproject.deep-technologies.com/privkey.pem ./certs/key.pem

# Changer les permissions
sudo chown $USER:$USER ./certs/cert.pem ./certs/key.pem

# Redémarrer tous les services
docker-compose up -d

echo "✅ Certificat SSL valide installé!"