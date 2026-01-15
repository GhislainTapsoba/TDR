-- Update permission names to dot notation
UPDATE permissions SET name = 'projects.create' WHERE name = 'create_projects';
UPDATE permissions SET name = 'projects.read' WHERE name = 'read_projects';
UPDATE permissions SET name = 'projects.update' WHERE name = 'update_projects';
UPDATE permissions SET name = 'projects.delete' WHERE name = 'delete_projects';

UPDATE permissions SET name = 'tasks.create' WHERE name = 'create_tasks';
UPDATE permissions SET name = 'tasks.read' WHERE name = 'read_tasks';
UPDATE permissions SET name = 'tasks.update' WHERE name = 'update_tasks';
UPDATE permissions SET name = 'tasks.delete' WHERE name = 'delete_tasks';

UPDATE permissions SET name = 'stages.create' WHERE name = 'create_stages';
UPDATE permissions SET name = 'stages.read' WHERE name = 'read_stages';
UPDATE permissions SET name = 'stages.update' WHERE name = 'update_stages';
UPDATE permissions SET name = 'stages.delete' WHERE name = 'delete_stages';

UPDATE permissions SET name = 'documents.create' WHERE name = 'create_documents';
UPDATE permissions SET name = 'documents.read' WHERE name = 'read_documents';
UPDATE permissions SET name = 'documents.update' WHERE name = 'update_documents';
UPDATE permissions SET name = 'documents.delete' WHERE name = 'delete_documents';

UPDATE permissions SET name = 'users.create' WHERE name = 'create_users';
UPDATE permissions SET name = 'users.read' WHERE name = 'read_users';
UPDATE permissions SET name = 'users.update' WHERE name = 'update_users';
UPDATE permissions SET name = 'users.delete' WHERE name = 'delete_users';

UPDATE permissions SET name = 'activity-logs.read' WHERE name = 'read_activity_logs';
UPDATE permissions SET name = 'dashboard.read' WHERE name = 'read_dashboard';
UPDATE permissions SET name = 'admin.access' WHERE name = 'admin_access';

-- Add tasks.assign if not exists
INSERT INTO permissions (name, description, resource, action)
SELECT 'tasks.assign', 'Assigner des tâches', 'tasks', 'assign'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'tasks.assign');

-- Assign tasks.assign to admin and chef_projet roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'tasks.assign'
WHERE r.name IN ('admin', 'chef_de_projet')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
