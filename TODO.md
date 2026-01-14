# TODO - Correction des erreurs React / API / Auth

## Priority 1 - Fix api.getTasks is not a function
- [x] Add getTasks and updateTaskStatus methods to api object in web-frontend/lib/api.ts
- [x] Update web-frontend/app/tasks/page.tsx to use tasksApi.getAll() and fix response handling

## Priority 2 - Secure React Hooks (useMemo)
- [x] Fix useMemo in web-frontend/app/projects/[id]/board/page.tsx to handle undefined stage.tasks
- [x] Ensure defaults in web-frontend/app/my-tasks/page.tsx for tasksByStatus

## Priority 3 - Fix 403 error on /api/users
- [x] Prevent calling usersApi.getAll() in web-frontend/app/users/page.tsx if user is not admin

## Priority 4 - Handle API errors properly
- [x] Add error state and UI in components for API failures
- [x] Ensure proper try/catch and logging in API calls
