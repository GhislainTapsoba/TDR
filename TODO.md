# TODO: Fix Tasks Page and Email Issues

## Tasks Page - Show Assigned Users
- [x] Update Task interface in web-frontend/app/tasks/page.tsx to use `assignees` array instead of `assignedUser`
- [x] Update display logic to show all assignees instead of single assignedUser
- [ ] Test that assignees are displayed correctly

## Email Configuration
- [ ] Set MAILJET_API_KEY and MAILJET_SECRET_KEY environment variables
- [ ] Create .env file with Mailjet credentials
- [ ] Restart services to apply new environment variables
- [ ] Test email sending functionality
