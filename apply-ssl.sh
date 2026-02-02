#!/bin/bash

echo "🔄 Copie du certificat Let's Encrypt valide..."

# Copier les certificats Let's Encrypt
sudo cp /etc/letsencrypt/live/teamproject.deep-technologies.com/fullchain.pem ./certs/cert.pem
sudo cp /etc/letsencrypt/live/teamproject.deep-technologies.com/privkey.pem ./certs/key.pem

# Permissions
sudo chown $USER:$USER ./certs/cert.pem ./certs/key.pem

# Redémarrer nginx
docker-compose restart nginx

echo "✅ Certificat SSL valide appliqué!"
echo "🌐 Testez: https://teamproject.deep-technologies.com"