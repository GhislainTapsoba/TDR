# Fix React Error #300 in Tasks Page

## Steps to Complete
- [x] Import useCallback and useMemo from React in web-frontend/app/tasks/page.tsx
- [x] Move isOverdue function outside the component
- [x] Memoize updateTaskStatus with useCallback
- [x] Memoize filteredTasks with useMemo
- [x] Test the changes in dev mode
