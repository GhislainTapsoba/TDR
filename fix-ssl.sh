#!/bin/bash

echo "=== Correction SSL TDR ==="

# Arrêter les services
echo "Arrêt des services..."
docker-compose down

# Vérifier si les certificats existent
if [ ! -f "./certs/cert.pem" ] || [ ! -f "./certs/key.pem" ]; then
    echo "Génération de nouveaux certificats auto-signés..."
    mkdir -p ./certs
    
    # Générer un certificat auto-signé valide
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ./certs/key.pem \
        -out ./certs/cert.pem \
        -subj "/C=FR/ST=France/L=Paris/O=Deep Technologies/CN=teamproject.deep-technologies.com" \
        -addext "subjectAltName=DNS:teamproject.deep-technologies.com,DNS:194.195.211.111,IP:194.195.211.111"
    
    chmod 644 ./certs/cert.pem
    chmod 600 ./certs/key.pem
    echo "✓ Certificats générés"
fi

# Redémarrer les services
echo "Redémarrage des services..."
docker-compose up -d

# Attendre que nginx démarre
echo "Attente du démarrage de nginx..."
sleep 10

# Tester la connexion SSL
echo "Test de la connexion SSL..."
curl -k -I https://teamproject.deep-technologies.com/ || echo "Erreur de connexion SSL"

echo "✓ Correction SSL terminée"
echo ""
echo "Si le problème persiste:"
echo "1. Vérifiez que le domaine pointe vers votre serveur"
echo "2. Utilisez le script setup-letsencrypt.sh pour des certificats valides"
echo "3. Redémarrez avec: docker-compose restart"