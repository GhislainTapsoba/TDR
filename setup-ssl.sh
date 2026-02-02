#!/bin/bash

# Installer certbot
sudo apt update
sudo apt install certbot

# Générer le certificat pour votre domaine
sudo certbot certonly --standalone -d teamproject.deep-technologies.com

# Copier les certificats
sudo cp /etc/letsencrypt/live/teamproject.deep-technologies.com/fullchain.pem ./certs/cert.pem
sudo cp /etc/letsencrypt/live/teamproject.deep-technologies.com/privkey.pem ./certs/key.pem

# Redémarrer les services
docker-compose down
docker-compose up -d

echo "Certificat SSL installé avec succès!"