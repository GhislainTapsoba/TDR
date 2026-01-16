-- Add admin.access permission if it doesn't exist
INSERT INTO public.permissions (name, description, resource, action)
VALUES ('admin.access', 'Accès administrateur complet', '*', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Assign admin.access to admin role if not already assigned
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name = 'admin.access'
WHERE r.name = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
