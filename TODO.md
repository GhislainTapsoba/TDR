# TODO: Ajouter des boutons rapides de changement de statut

## Tâches à faire:
- [x] Modifier web-frontend/app/tasks/page.tsx : Remplacer le Select par des boutons colorés pour changer le statut des tâches
- [x] Modifier web-frontend/app/stages/page.tsx : Ajouter des boutons colorés pour changer le statut des étapes
- [x] Modifier web-frontend/app/projects/page.tsx : Ajouter des boutons colorés pour changer le statut des projets
- [x] Tester les changements pour s'assurer que les boutons fonctionnent correctement et respectent les permissions

## Détails techniques:
- Utiliser les couleurs déjà définies dans statusColors
- Ajouter des fonctions updateStageStatus et updateProjectStatus similaires à updateTaskStatus
- Vérifier les permissions avant d'afficher les boutons
- Les boutons doivent être petits et visuellement distincts
