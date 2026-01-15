# TODO - Fix Chef de Projet Selection in Project Creation

## Completed Tasks
- [x] Analyze the issue: Chef de projet not visible in project creation select
- [x] Identify root cause: Hardcoded admin check in /api/users blocking managers from fetching users
- [x] Modify api-backend/app/api/users/route.ts to remove hardcoded admin check
- [x] Update comment in the API to reflect roles authorized

## Followup Steps
- [ ] Test the project creation page to ensure chef de projet select now shows users
- [ ] Verify that users with role 'chef_projet' or 'admin' appear in the dropdown
- [ ] Confirm project creation works with selected chef de projet
