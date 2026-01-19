# TODO: Fix Tasks Page and Email Issues

## Tasks Page - Show Assigned Users
- [x] Update Task interface in web-frontend/app/tasks/page.tsx to use `assignees` array instead of `assignedUser`
- [x] Update display logic to show all assignees instead of single assignedUser
- [ ] Test that assignees are displayed correctly

## Project Page - Show Assigned Users and Stage Actions
- [x] Update Task interface in web-frontend/app/projects/[id]/page.tsx to use `assignees` array
- [x] Update display logic to show all assignees for tasks
- [x] Add action buttons (edit, complete, delete) for stages
- [ ] Test that assignees are displayed correctly and stage actions work

## Add Edit/Delete Actions to List Pages with Permission Checks
- [x] Projects page: Add dropdown menu with edit/delete actions using permission checks
- [x] Update create buttons to use permission checks instead of role checks
- [x] Tasks page: Add edit/delete actions to task cards
- [x] Stages page: Add edit/delete actions to stage cards
- [x] Users page: Already has edit/delete with permissions (good)

## Email Configuration
- [ ] Set MAILJET_API_KEY and MAILJET_SECRET_KEY environment variables
- [ ] Create .env file with Mailjet credentials
- [ ] Restart services to apply new environment variables
- [ ] Test email sending functionality

## Build Fixes
- [x] Fix missing mapRole import in UserDeleteModal and UserEditModal components
