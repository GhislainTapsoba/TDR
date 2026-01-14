# TODO - Corrections des erreurs

## 1. Corriger l'erreur toLowerCase() sur null
- [x] web-frontend/app/users/page.tsx: Ajouter vérifications null pour user.name et user.email
- [x] web-frontend/app/tasks/page.tsx: Ajouter vérifications null pour task.title et task.project.title
- [x] web-frontend/app/projects/page.tsx: Ajouter vérifications null pour project.title et project.description

## 2. Corriger l'erreur React useMemo (#310)
- [x] Vérifier tous les useMemo et useCallback dans le code (apparemment corrects)

## 3. Vérifications générales
- [x] Tester avec des données vides/nulles (code corrigé pour gérer null/undefined)
- [x] Vérifier la console pour erreurs (fixes appliqués)
