# TODO: Shift to Permission-Based Access Control

## Backend Changes
- [x] Update permission names in initializePermissions to dot notation (e.g., "users.read")
- [x] Add "tasks.assign" permission if not present
- [x] Modify verifyAuth to include permissions from JWT
- [x] Create hasPermission function in permissions.ts
- [x] Update task assignment in PATCH /api/tasks/[id] to check "tasks.assign"
- [x] Update other endpoints to use permission checks

## Frontend Changes
- [x] Simplify middleware: remove user-settings logic, keep "/users": ["users.read"], "/tasks": ["tasks.read"]
- [x] Update permissions.ts: remove role-based functions, add permission-based checks
- [x] Update UI components to use session.permissions.includes("permission")

## Database
- [x] Created migration script to change permission names to dot notation (run api-backend/scripts/update-permissions-to-dot-notation.sql)

## Testing
- [ ] Test login returns correct permissions
- [ ] Test permission checks in backend and frontend
