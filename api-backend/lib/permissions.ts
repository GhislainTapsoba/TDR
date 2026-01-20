 /**
 * Role-Based Access Control (RBAC) System using database
 */

import { db } from './db';

export type UserRole = 'admin' | 'manager' | 'user';

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage' | 'assign';
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

// Cache for permissions
let permissionsCache: Permission[] = [];
let rolePermissionsCache: Map<string, Permission[]> = new Map();
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load permissions from database
 */
async function loadPermissionsFromDB(): Promise<Permission[]> {
  try {
    const query = 'SELECT id, name, description, resource, action FROM permissions';
    const { rows } = await db.query(query);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      resource: row.resource,
      action: row.action,
    }));
  } catch (error) {
    console.error('Error loading permissions from DB:', error);
    return [];
  }
}

/**
 * Load role permissions from database
 */
async function loadRolePermissionsFromDB(): Promise<Map<string, Permission[]>> {
  try {
    const query = `
      SELECT r.name as role_name, p.id, p.name, p.description, p.resource, p.action
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
    `;
    const { rows } = await db.query(query);

    const rolePermissions = new Map<string, Permission[]>();
    rows.forEach(row => {
      const roleName = row.role_name;
      const permission: Permission = {
        id: row.id,
        name: row.name,
        description: row.description,
        resource: row.resource,
        action: row.action,
      };

      if (!rolePermissions.has(roleName)) {
        rolePermissions.set(roleName, []);
      }
      rolePermissions.get(roleName)!.push(permission);
    });

    return rolePermissions;
  } catch (error) {
    console.error('Error loading role permissions from DB:', error);
    return new Map();
  }
}

/**
 * Get permissions for a role, using cache or loading from DB
 */
async function getRolePermissionsFromDB(roleName: string): Promise<Permission[]> {
  // Check if cache is valid
  if (Date.now() - lastCacheUpdate > CACHE_DURATION || permissionsCache.length === 0) {
    permissionsCache = await loadPermissionsFromDB();
    rolePermissionsCache = await loadRolePermissionsFromDB();
    lastCacheUpdate = Date.now();
  }

  return rolePermissionsCache.get(roleName) || [];
}

/**
 * Check if a user has permission to perform an action on a resource
 */
export async function hasPermission(
  userRole: UserRole,
  resource: string,
  action: Permission['action']
): Promise<boolean> {
  const permissions = await getRolePermissionsFromDB(userRole);



  // Check for wildcard permission (admin)
  const hasWildcard = permissions.some(
    (p) => p.resource === '*' && (p.action === 'manage' || p.action === action)
  );

  if (hasWildcard) {
    return true;
  }

  // Check for specific permission
  return permissions.some(
    (p) => p.resource === resource && (p.action === 'manage' || p.action === action)
  );
}

/**
 * Require permission middleware helper
 * Returns error response if user doesn't have permission
 */
export async function requirePermission(
  userRole: UserRole,
  resource: string,
  action: Permission['action']
): Promise<{ allowed: boolean; error?: string }> {
  const allowed = await hasPermission(userRole, resource, action);

  if (!allowed) {
    return {
      allowed: false,
      error: `Permission denied: ${userRole} cannot ${action} ${resource}`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can manage a specific project (is project manager or admin)
 */
export function canManageProject(
  userRole: UserRole,
  userId: string,
  projectManagerId: string | null
): boolean {
  if (userRole === 'admin') {
    return true;
  }

  if (userRole === 'manager' && projectManagerId === userId) {
    return true;
  }

  return false;
}

/**
 * Check if user can edit a specific task (is assignee, project manager, or admin)
 */
export function canEditTask(
  userRole: UserRole,
  userId: string,
  taskAssignees: string[],
  projectManagerId: string | null
): boolean {
  if (userRole === 'admin') {
    return true;
  }

  if (userRole === 'manager' && projectManagerId === userId) {
    return true;
  }

  if (taskAssignees.includes(userId)) {
    return true;
  }

  return false;
}

/**
 * Get all permissions for a role
 */
export async function getRolePermissions(userRole: UserRole): Promise<Permission[]> {
  return await getRolePermissionsFromDB(userRole);
}

/**
 * Mapper le rôle stocké en base (ADMIN / MANAGER / EMPLOYE)
 * vers le rôle applicatif du système de permissions
 */
export function mapDbRoleToUserRole(dbRole: string | null): UserRole {
  const role = dbRole?.toUpperCase();
  switch (role) {
    case 'ADMIN':
      return 'admin';
    case 'MANAGER':
      return 'manager';
    case 'EMPLOYE':
      return 'user';
    default:
      return 'user';
  }
}

/**
 * Check if role can access admin features
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'admin';
}

/**
 * Check if role can manage teams (admin or manager)
 */
export function canManageTeam(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'manager';
}

/**
 * Check if user has a specific permission
 */
export function hasUserPermission(userPermissions: string[], permission: string): boolean {
  return userPermissions.includes(permission);
}

/**
 * Initialize default permissions and role assignments
 * This should be called during application startup or via a migration
 */
export async function initializePermissions(): Promise<void> {
  try {
    // Define default permissions
    const defaultPermissions = [
      // Projects
      { name: 'projects.create', description: 'Créer des projets', resource: 'projects', action: 'create' },
      { name: 'projects.read', description: 'Lire les projets', resource: 'projects', action: 'read' },
      { name: 'projects.update', description: 'Modifier les projets', resource: 'projects', action: 'update' },
      { name: 'projects.delete', description: 'Supprimer les projets', resource: 'projects', action: 'delete' },

      // Tasks
      { name: 'tasks.create', description: 'Créer des tâches', resource: 'tasks', action: 'create' },
      { name: 'tasks.read', description: 'Lire les tâches', resource: 'tasks', action: 'read' },
      { name: 'tasks.update', description: 'Modifier les tâches', resource: 'tasks', action: 'update' },
      { name: 'tasks.assign', description: 'Assigner des tâches', resource: 'tasks', action: 'assign' },
      { name: 'tasks.delete', description: 'Supprimer les tâches', resource: 'tasks', action: 'delete' },

      // Stages
      { name: 'stages.create', description: 'Créer des étapes', resource: 'stages', action: 'create' },
      { name: 'stages.read', description: 'Lire les étapes', resource: 'stages', action: 'read' },
      { name: 'stages.update', description: 'Modifier les étapes', resource: 'stages', action: 'update' },
      { name: 'stages.delete', description: 'Supprimer les étapes', resource: 'stages', action: 'delete' },

      // Documents
      { name: 'documents.create', description: 'Créer des documents', resource: 'documents', action: 'create' },
      { name: 'documents.read', description: 'Lire les documents', resource: 'documents', action: 'read' },
      { name: 'documents.update', description: 'Modifier les documents', resource: 'documents', action: 'update' },
      { name: 'documents.delete', description: 'Supprimer les documents', resource: 'documents', action: 'delete' },

      // Users
      { name: 'users.create', description: 'Créer des utilisateurs', resource: 'users', action: 'create' },
      { name: 'users.read', description: 'Lire les utilisateurs', resource: 'users', action: 'read' },
      { name: 'users.update', description: 'Modifier les utilisateurs', resource: 'users', action: 'update' },
      { name: 'users.delete', description: 'Supprimer les utilisateurs', resource: 'users', action: 'delete' },

      // Activity logs
      { name: 'activity-logs.read', description: 'Lire les logs d\'activité', resource: 'activity-logs', action: 'read' },

      // Dashboard
      { name: 'dashboard.read', description: 'Lire le tableau de bord', resource: 'dashboard', action: 'read' },

      // Admin wildcard
      { name: 'admin.access', description: 'Accès administrateur complet', resource: '*', action: 'manage' },
    ];

    // Fetch existing permissions to avoid duplicates
    const { rows: existingPermissionsRows } = await db.query('SELECT name FROM permissions');
    const existingPermissionNames = new Set(existingPermissionsRows.map(row => row.name));

    // Insert missing permissions
    for (const perm of defaultPermissions) {
      if (!existingPermissionNames.has(perm.name)) {
        await db.query(
          'INSERT INTO permissions (name, description, resource, action) VALUES ($1, $2, $3, $4)',
          [perm.name, perm.description, perm.resource, perm.action]
        );
        console.log(`Added missing permission: ${perm.name}`);
      }
    }

    // Get role IDs
    const { rows: roles } = await db.query('SELECT id, name FROM roles');
    const adminRole = roles.find(r => r.name === 'admin');
    const managerRole = roles.find(r => r.name === 'manager');
    const employeRole = roles.find(r => r.name === 'employe');

    // Get all permission IDs (including newly added ones)
    const { rows: permissions } = await db.query('SELECT id, name, resource, action FROM permissions');

    // --- Admin Role Assignments ---
    if (adminRole) {
      // Clear existing admin role permissions
      await db.query('DELETE FROM role_permissions WHERE role_id = $1', [adminRole.id]);
      // Assign all permissions to admin
      for (const perm of permissions) {
        await db.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [adminRole.id, perm.id]
        );
      }
      console.log('Admin role permissions re-assigned.');
    }

    // --- Manager Role Assignments ---
    if (managerRole) {
      // Clear existing manager role permissions
      await db.query('DELETE FROM role_permissions WHERE role_id = $1', [managerRole.id]);
      // Assign specific permissions to manager
      const managerAssignments = permissions.filter(p =>
        ['projects', 'tasks', 'stages', 'documents', 'activity-logs', 'dashboard'].includes(p.resource) ||
        p.name === 'users.read'
      );
      for (const perm of managerAssignments) {
        await db.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [managerRole.id, perm.id]
        );
      }
      console.log('Manager role permissions re-assigned.');
    }

    // --- Employe Role Assignments ---
    if (employeRole) {
      // Clear existing employe role permissions
      await db.query('DELETE FROM role_permissions WHERE role_id = $1', [employeRole.id]);
      // Assign specific permissions to employe
      const employeAssignments = permissions.filter(p =>
        (['tasks', 'stages', 'documents'].includes(p.resource) && ['create', 'read', 'update'].includes(p.action)) ||
        (p.resource === 'projects' && p.action === 'read') ||
        p.resource === 'activity-logs' ||
        p.resource === 'dashboard'
      );
      for (const perm of employeAssignments) {
        await db.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [employeRole.id, perm.id]
        );
      }
      console.log('Employe role permissions re-assigned.');
    }

    console.log('Permissions initialized successfully!');

    // Force cache refresh after init
    permissionsCache = [];
    rolePermissionsCache.clear();
    lastCacheUpdate = 0;

  } catch (error) {
    console.error('Error initializing permissions:', error);
  }
}
