-- Rename role from 'chef_projet' to 'chef_de_projet' to match the update script
UPDATE public.roles
SET name = 'chef_de_projet', description = 'Chef de projet - gestion des projets'
WHERE name = 'chef_projet';

-- Assign permissions to 'chef_de_projet' if not already assigned
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'chef_de_projet'
AND p.name IN (
  'projects.create', 'projects.read', 'projects.update', 'projects.delete',
  'tasks.create', 'tasks.read', 'tasks.update', 'tasks.assign', 'tasks.delete',
  'stages.create', 'stages.read', 'stages.update', 'stages.delete',
  'documents.create', 'documents.read', 'documents.update', 'documents.delete',
  'users.read',
  'activity-logs.read',
  'dashboard.read'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Also ensure admin has all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Employe permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'employe'
AND p.name IN (
  'projects.read',
  'tasks.create', 'tasks.read', 'tasks.update',
  'stages.create', 'stages.read', 'stages.update',
  'documents.create', 'documents.read', 'documents.update',
  'activity-logs.read',
  'dashboard.read'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
