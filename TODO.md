# TODO List for Fixing Errors and Adding Stage Page

## 1. Fix API Methods Missing
- [x] Add missing methods to web-frontend/lib/api.ts (getProject, getProjects, getUsers, getProjectStages, etc.)

## 2. Fix PUT Method Not Allowed
- [x] Add PUT handler to api-backend/app/api/users/[id]/route-new.ts

## 3. Fix Switch Uncontrolled to Controlled
- [x] Ensure Switch checked prop is always boolean in web-frontend/app/users/[id]/edit/page.tsx

## 4. Check Permissions for Delete Users
- [ ] Verify user permissions for deleting users (may need role adjustment)

## 5. Create Add Stage Page
- [x] Create web-frontend/app/projects/[id]/stages/new/page.tsx (already exists and implemented)

## 6. Testing
- [ ] Test all fixes
- [ ] Verify stage creation works

## 7. Project Cleanup
- [x] Archive old test files and organize project structure (project already clean)
