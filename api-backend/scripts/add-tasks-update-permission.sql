-- Add tasks.update permission to employe role
-- This allows employees to update tasks they are assigned to

-- First, ensure the permission exists
INSERT INTO permissions (name, description, resource, action)
VALUES ('tasks.update', 'Modifier les tâches', 'tasks', 'update')
ON CONFLICT (name) DO NOTHING;

-- Get the permission ID
-- Get the employe role ID
-- Assign the permission to the role

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'employe'
  AND p.name = 'tasks.update'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Verify the assignment
SELECT r.name as role_name, p.name as permission_name
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'employe' AND p.name = 'tasks.update';
