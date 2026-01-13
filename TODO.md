# TODO - Corrections apportées

## Problèmes résolus

### 1. Statuts des projets et tâches en anglais
- **Fichier modifié :** `web-frontend/app/dashboard/page.tsx`
- **Changement :** Ajout de mappages pour traduire les statuts en français dans les badges du tableau de bord.
- **Détails :**
  - Ajout de `projectStatusLabels` et `taskStatusLabels` pour mapper les statuts anglais/français.
  - Modification de l'affichage des badges pour utiliser les étiquettes françaises.

### 2. Statuts des étapes
- **Fichier vérifié :** `web-frontend/components/StagesManager.tsx`
- **Statut :** Déjà en français ("En attente", "En cours", "Terminée", "Bloquée").

### 3. Sidebar non affiché
- **Fichier vérifié :** `web-frontend/components/layout/sidebar.tsx`
- **Statut :** Le sidebar est inclus dans `MainLayout`, utilisé sur toutes les pages authentifiées.
- **Note :** Le sidebar peut être replié via cookie utilisateur. L'utilisateur peut le développer en cliquant sur le bouton de bascule.

## Étapes de suivi
- Tester les changements en naviguant sur le tableau de bord pour vérifier les étiquettes françaises.
- Si le sidebar ne s'affiche toujours pas, vérifier la console pour les erreurs JavaScript ou problèmes CSS.
- Vérifier sur différents appareils (desktop/mobile) car le sidebar a un comportement responsive.
