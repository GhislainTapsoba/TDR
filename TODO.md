# TODO: Fix Application Errors

## Completed Tasks

- [x] Update tasks GET API to include project and stage information by joining tables and selecting fields.
- [x] Transform tasks response to include project and stage objects.
- [x] Update POST tasks API to include project and stage in response.
- [x] Remove access check for reading projects in API, allowing all authenticated users to view project details (actions restricted by frontend permissions).

## Followup Steps

- [ ] Test the application by running it and navigating to my-tasks and project pages to ensure no TypeError on undefined 'id'.
- [x] Verify that employees can now view project details without 403 errors.
- [ ] Check for any other potential undefined property accesses in the codebase.
