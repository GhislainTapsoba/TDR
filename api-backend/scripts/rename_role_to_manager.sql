-- Update the role name from 'chef_de_projet' to 'manager'
UPDATE public.roles
SET name = 'manager', description = 'Manager - gestion des projets'
WHERE name = 'chef_de_projet';

-- Update roleLabels in sidebar if needed, but since it's code, we'll update code
