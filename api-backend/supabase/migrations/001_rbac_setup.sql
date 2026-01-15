-- Migration: Add RBAC (Role-Based Access Control) system
-- Date: 2024

-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  resource character varying NOT NULL,
  action character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE
);

-- Add role_id to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id uuid;
ALTER TABLE public.users ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);

-- Insert default roles
INSERT INTO public.roles (id, name, description) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'admin', 'Administrateur - accès complet'),
  ('550e8400-e29b-41d4-a716-446655440002', 'manager', 'Manager - gestion des projets'),
  ('550e8400-e29b-41d4-a716-446655440003', 'employe', 'Employé - accès limité'),
  ('550e8400-e29b-41d4-a716-446655440004', 'viewer', 'Observateur - lecture seule')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO public.permissions (id, name, description, resource, action) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'view_dashboard', 'Voir le tableau de bord', 'dashboard', 'view'),
  ('660e8400-e29b-41d4-a716-446655440002', 'view_projects', 'Voir les projets', 'projects', 'view'),
  ('660e8400-e29b-41d4-a716-446655440003', 'create_projects', 'Créer des projets', 'projects', 'create'),
  ('660e8400-e29b-41d4-a716-446655440004', 'edit_projects', 'Modifier les projets', 'projects', 'edit'),
  ('660e8400-e29b-41d4-a716-446655440005', 'view_my_tasks', 'Voir mes tâches', 'tasks', 'view'),
  ('660e8400-e29b-41d4-a716-446655440006', 'view_all_tasks', 'Voir toutes les tâches', 'tasks', 'view'),
  ('660e8400-e29b-41d4-a716-446655440007', 'create_tasks', 'Créer des tâches', 'tasks', 'create'),
  ('660e8400-e29b-41d4-a716-446655440008', 'edit_tasks', 'Modifier les tâches', 'tasks', 'edit'),
  ('660e8400-e29b-41d4-a716-446655440009', 'manage_users', 'Gérer les utilisateurs', 'users', 'manage'),
  ('660e8400-e29b-41d4-a716-446655440010', 'view_activity', 'Voir les activités', 'activity', 'view'),
  ('660e8400-e29b-41d4-a716-446655440011', 'export_data', 'Exporter les données', 'export', 'create'),
  ('660e8400-e29b-41d4-a716-446655440012', 'manage_settings', 'Gérer les paramètres', 'settings', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Admin: all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager: dashboard, projects (all), my_tasks, all_tasks, activity, export, settings
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'manager'
  AND p.name IN ('view_dashboard', 'view_projects', 'create_projects', 'edit_projects', 'view_my_tasks', 'view_all_tasks', 'create_tasks', 'edit_tasks', 'view_activity', 'export_data', 'manage_settings')
ON CONFLICT DO NOTHING;

-- Employé: dashboard, projects (view), my_tasks, settings
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'employe'
  AND p.name IN ('view_dashboard', 'view_projects', 'view_my_tasks', 'manage_settings')
ON CONFLICT DO NOTHING;

-- Viewer: dashboard, projects (view), my_tasks
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'viewer'
  AND p.name IN ('view_dashboard', 'view_projects', 'view_my_tasks')
ON CONFLICT DO NOTHING;

-- Update existing users to have role_id based on their current role
UPDATE public.users
SET role_id = r.id
FROM public.roles r
WHERE users.role::text = r.name;

-- Make role_id NOT NULL after migration
-- ALTER TABLE public.users ALTER COLUMN role_id SET NOT NULL;

-- Note: Keep the role column for backward compatibility during transition
-- It can be removed later after updating all code
