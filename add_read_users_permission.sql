-- Add read_users permission if not exists
INSERT INTO permissions (name, description, resource, action)
VALUES ('read_users', 'Lire les utilisateurs', 'users', 'read')
ON CONFLICT (name) DO NOTHING;

-- Assign read_users permission to admin and chef_projet roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.name = 'read_users'
AND r.name IN ('admin', 'chef_projet')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
