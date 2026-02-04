# TODO: Fix Docker Logs Errors

## Completed Tasks
- [x] Fix export error: TypeError: h.join is not a function
  - Modified `api-backend/app/api/export/route.ts` to handle `types` as a string and split it into an array.
- [x] Fix delete task error: Foreign key constraint violation
  - Modified `api-backend/app/api/tasks/[id]/route.ts` to delete related documents and comments before deleting the task.

## Summary
- Export route now properly parses the comma-separated string `types` from the frontend into an array.
- Delete task route now deletes dependent records (comments, documents, task_assignees) before deleting the task to avoid foreign key constraints.
