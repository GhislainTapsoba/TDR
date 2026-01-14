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
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
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
  const now = Date.now();
  if (now - lastCacheUpdate > CACHE_DURATION) {
    // Refresh cache
    permissionsCache = await loadPermissionsFromDB();
    rolePermissionsCache = await loadRolePermissionsFromDB();
    lastCacheUpdate = now;
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
  taskAssigneeId: string | null,
  projectManagerId: string | null
): boolean {
  if (userRole === 'admin') {
    return true;
  }

  if (userRole === 'manager' && projectManagerId === userId) {
    return true;
  }

  if (taskAssigneeId === userId) {
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
 * Mapper le rôle stocké en base (ADMIN / PROJECT_MANAGER / EMPLOYEE)
 * vers le rôle applicatif du système de permissions
 */
export function mapDbRoleToUserRole(dbRole: string | null): UserRole {
  const role = dbRole?.toUpperCase();
  switch (role) {
    case 'ADMIN':
      return 'admin';
    case 'PROJECT_MANAGER':
      return 'manager';
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
 * Initialize default permissions and role assignments
 * This should be called during application startup or via a migration
 */
export async function initializePermissions(): Promise<void> {
  try {
    // Check if permissions already exist
    const { rows: existingPerms } = await db.query('SELECT COUNT(*) as count FROM permissions');
    if (parseInt(existingPerms[0].count) > 0) {
      console.log('Permissions already initialized');
      return;
    }

    // Define default permissions
    const defaultPermissions = [
      // Projects
      { name: 'create_projects', description: 'Créer des projets', resource: 'projects', action: 'create' },
      { name: 'read_projects', description: 'Lire les projets', resource: 'projects', action: 'read' },
      { name: 'update_projects', description: 'Modifier les projets', resource: 'projects', action: 'update' },
      { name: 'delete_projects', description: 'Supprimer les projets', resource: 'projects', action: 'delete' },

      // Tasks
      { name: 'create_tasks', description: 'Créer des tâches', resource: 'tasks', action: 'create' },
      { name: 'read_tasks', description: 'Lire les tâches', resource: 'tasks', action: 'read' },
      { name: 'update_tasks', description: 'Modifier les tâches', resource: 'tasks', action: 'update' },
      { name: 'delete_tasks', description: 'Supprimer les tâches', resource: 'tasks', action: 'delete' },

      // Stages
      { name: 'create_stages', description: 'Créer des étapes', resource: 'stages', action: 'create' },
      { name: 'read_stages', description: 'Lire les étapes', resource: 'stages', action: 'read' },
      { name: 'update_stages', description: 'Modifier les étapes', resource: 'stages', action: 'update' },
      { name: 'delete_stages', description: 'Supprimer les étapes', resource: 'stages', action: 'delete' },

      // Documents
      { name: 'create_documents', description: 'Créer des documents', resource: 'documents', action: 'create' },
      { name: 'read_documents', description: 'Lire les documents', resource: 'documents', action: 'read' },
      { name: 'update_documents', description: 'Modifier les documents', resource: 'documents', action: 'update' },
      { name: 'delete_documents', description: 'Supprimer les documents', resource: 'documents', action: 'delete' },

      // Users
      { name: 'create_users', description: 'Créer des utilisateurs', resource: 'users', action: 'create' },
      { name: 'read_users', description: 'Lire les utilisateurs', resource: 'users', action: 'read' },
      { name: 'update_users', description: 'Modifier les utilisateurs', resource: 'users', action: 'update' },
      { name: 'delete_users', description: 'Supprimer les utilisateurs', resource: 'users', action: 'delete' },

      // Activity logs
      { name: 'read_activity_logs', description: 'Lire les logs d\'activité', resource: 'activity-logs', action: 'read' },

      // Admin wildcard
      { name: 'admin_access', description: 'Accès administrateur complet', resource: '*', action: 'manage' },
    ];

    // Insert permissions
    for (const perm of defaultPermissions) {
      await db.query(
        'INSERT INTO permissions (name, description, resource, action) VALUES ($1, $2, $3, $4)',
        [perm.name, perm.description, perm.resource, perm.action]
      );
    }

    // Get role IDs
    const { rows: roles } = await db.query('SELECT id, name FROM roles');
    const adminRole = roles.find(r => r.name === 'admin');
    const chefProjetRole = roles.find(r => r.name === 'chef_de_projet');
    const employeRole = roles.find(r => r.name === 'employe');

    // Get permission IDs
    const { rows: permissions } = await db.query('SELECT id, name FROM permissions');

    // Assign permissions to roles
    const roleAssignments = [
      // Admin gets all permissions
      ...permissions.map(p => ({ role_id: adminRole?.id, permission_id: p.id })),

      // Chef de projet gets project, task, stage, document permissions
      ...permissions.filter(p =>
        ['projects', 'tasks', 'stages', 'documents', 'activity-logs'].includes(p.resource) ||
        p.name === 'read_users'
      ).map(p => ({ role_id: chefProjetRole?.id, permission_id: p.id })),

      // Employé gets read and create permissions for tasks, stages, documents
      ...permissions.filter(p =>
        (['tasks', 'stages', 'documents'].includes(p.resource) && ['create', 'read', 'update'].includes(p.action)) ||
        (p.resource === 'projects' && p.action === 'read') ||
        p.resource === 'activity-logs'
      ).map(p => ({ role_id: employeRole?.id, permission_id: p.id })),
    ];

    // Insert role permissions
    for (const assignment of roleAssignments) {
      if (assignment.role_id && assignment.permission_id) {
        await db.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [assignment.role_id, assignment.permission_id]
        );
      }
    }

    console.log('Permissions initialized successfully');
  } catch (error) {
    console.error('Error initializing permissions:', error);
  }
}
