-- Fix permissions for dashboard and activity-logs

-- Add dashboard permission if not exists
INSERT INTO permissions (name, description, resource, action)
VALUES ('read_dashboard', 'Lire le tableau de bord', 'dashboard', 'read')
ON CONFLICT (name) DO NOTHING;

-- Assign dashboard permission to all roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.name = 'read_dashboard'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Assign activity-logs permission to all roles (in case missing)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.resource = 'activity-logs' AND p.action = 'read'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Verify permissions
SELECT r.name as role_name, p.name as permission_name, p.resource, p.action
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.resource IN ('dashboard', 'activity-logs', 'projects', 'tasks', 'users')
ORDER BY r.name, p.resource;
