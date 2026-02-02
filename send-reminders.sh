#!/bin/bash

# Script pour envoyer automatiquement les rappels de tâches
# À exécuter quotidiennement via cron

API_URL="http://localhost:3000/api"
LOG_FILE="/var/log/task-reminders.log"

echo "$(date): Début de l'envoi des rappels de tâches" >> $LOG_FILE

# Appeler l'API des rappels
response=$(curl -s -X POST "$API_URL/reminders" \
  -H "Content-Type: application/json" \
  -w "HTTP_STATUS:%{http_code}")

http_status=$(echo $response | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
response_body=$(echo $response | sed 's/HTTP_STATUS:[0-9]*$//')

if [ "$http_status" = "200" ]; then
    echo "$(date): Rappels envoyés avec succès - $response_body" >> $LOG_FILE
else
    echo "$(date): Erreur lors de l'envoi des rappels (HTTP $http_status) - $response_body" >> $LOG_FILE
fi

echo "$(date): Fin de l'envoi des rappels de tâches" >> $LOG_FILE