✅ TODO – Fix NextAuth & Architecture
🧹 1. Nettoyage (backend)

 ✅ Supprimer le dossier api-backend/app/api/auth/[...nextauth]

 Vérifier qu'il ne reste aucune référence à NextAuth dans le backend

🧩 2. Ajouter NextAuth au frontend

 ✅ Créer le dossier web-frontend/app/api/auth/[...nextauth]

 ✅ Créer le fichier route.ts

 ✅ Ajouter le code exact

🌍 3. Variables d’environnement (frontend)

 ✅ Modifier web-frontend/.env

NEXTAUTH_URL=http://194.195.211.111
NEXTAUTH_SECRET=nouvelle_cle_secrete
NEXT_PUBLIC_API_URL=http://194.195.211.111/api

 Supprimer toute URL localhost ou /server

🌐 4. Nginx (reverse proxy)

 ✅ Vérifier que /api/auth pointe vers le frontend

 ✅ Vérifier que /api pointe vers le backend

location /api/auth {
  proxy_pass http://web-frontend:3000;
}

location /api {
  proxy_pass http://api-backend:3001;
}

🔐 5. Login frontend

 ✅ Modifier app/login/page.tsx

 Utiliser :

signIn("credentials", {
  email,
  password,
  redirect: false,
});

 Supprimer tout fetch("/api/auth/login")

🧠 6. Session globale

 ✅ Ajouter SessionProvider dans app/layout.tsx

🔒 7. Middleware (si nécessaire)

 ✅ Créer / vérifier middleware.ts

export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*"],
};

🔁 8. Rebuild & déploiement

 Arrêter les containers / serveurs

 Rebuild complet (no cache)

 Redémarrer les services

🧪 9. Test final

 Ouvrir :

http://194.195.211.111/api/auth/session

 Résultat attendu :

null
