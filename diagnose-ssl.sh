#!/bin/bash

echo "=== Diagnostic SSL pour TDR ==="
echo ""

# Vérifier les certificats
echo "1. Vérification des certificats locaux:"
if [ -f "./certs/cert.pem" ]; then
    echo "✓ Certificat trouvé: ./certs/cert.pem"
    openssl x509 -in ./certs/cert.pem -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:)"
else
    echo "✗ Certificat manquant: ./certs/cert.pem"
fi

if [ -f "./certs/key.pem" ]; then
    echo "✓ Clé privée trouvée: ./certs/key.pem"
else
    echo "✗ Clé privée manquante: ./certs/key.pem"
fi

echo ""

# Vérifier la connectivité SSL
echo "2. Test de connectivité SSL:"
echo "Tentative de connexion à teamproject.deep-technologies.com:443..."
timeout 10 openssl s_client -connect teamproject.deep-technologies.com:443 -servername teamproject.deep-technologies.com < /dev/null

echo ""

# Vérifier les services Docker
echo "3. État des services Docker:"
docker-compose ps

echo ""

# Vérifier les logs nginx
echo "4. Logs nginx (dernières 10 lignes):"
docker-compose logs --tail=10 nginx

echo ""
echo "=== Fin du diagnostic ==="