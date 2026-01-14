-- Add activity-logs permission
INSERT INTO permissions (name, description, resource, action)
VALUES ('read_activity_logs', 'Lire les logs d''activité', 'activity-logs', 'read')
ON CONFLICT (name) DO NOTHING;

-- Assign to all roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.name = 'read_activity_logs'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
