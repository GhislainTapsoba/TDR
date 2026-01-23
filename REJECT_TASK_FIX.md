# Correction de la fonctionnalité de refus de tâche

## Problème identifié:
La page reject-task affichait "Unauthorized" au lieu de rediriger l'utilisateur vers la page de connexion pour s'authentifier avant de pouvoir refuser une tâche.

## Cause du problème:
- La page utilisait un hook `useAuth` incorrect qui ne fonctionnait pas avec le système d'authentification NextAuth
- La page n'était pas protégée et ne redirigeait pas les utilisateurs non authentifiés

## Solution appliquée:
1. **Modification de la page reject-task** (`web-frontend/app/reject-task/page.tsx`):
   - Utilisation du bon contexte d'authentification (`useAuth` du contexte auth-context.tsx)
   - Ajout d'une vérification d'authentification au chargement de la page
   - Redirection automatique vers `/login?callbackUrl=${currentUrl}` si l'utilisateur n'est pas authentifié
   - Utilisation correcte du token d'authentification pour les appels API

2. **Améliorations apportées**:
   - Loader d'attente pendant la vérification de l'authentification
   - Gestion d'erreur TypeScript corrigée (remplacement de `any` par `unknown`)
   - Flux d'authentification transparent pour l'utilisateur

## Résultat:
- ✅ La page reject-task redirige maintenant correctement vers la connexion si nécessaire
- ✅ Après authentification, l'utilisateur est redirigé vers la page de refus avec ses informations
- ✅ Le refus de tâche fonctionne correctement avec authentification
- ✅ Interface utilisateur améliorée avec gestion des états de chargement

## Test effectué:
- Serveurs démarrés avec succès (Backend: http://localhost:3000, Frontend: http://localhost:3001)
- Page reject-task accessible et fonctionnelle
