/**
 * Frontend Role-Based Access Control (RBAC) System
 *
 * Roles:
 * - admin: Full access to everything
 * - manager: Can manage projects and teams
 * - user: Can only view and edit assigned tasks
 */

export type UserRole = 'admin' | 'manager' | 'user';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

/**
 * Check if a user has permission to perform an action on a resource
 */
export function hasPermission(
  userRole: UserRole | string | undefined,
  resource: string,
  action: Permission['action']
): boolean {
  if (!userRole) return false;

  // Admin has all permissions
  if (userRole === 'admin') {
    return true;
  }

  // Manager permissions
  if (userRole === 'manager') {
    const managerResources = [
      'projects',
      'tasks',
      'stages',
      'documents',
      'activity-logs',
    ];

    if (managerResources.includes(resource)) {
      return true;
    }

    // Managers can read users but not create/delete
    if (resource === 'users' && action === 'read') {
      return true;
    }
  }

  // User permissions
  if (userRole === 'user') {
    // Can read most things (including stages in READ-ONLY mode)
    if (action === 'read') {
      return ['projects', 'tasks', 'stages', 'documents', 'activity-logs'].includes(
        resource
      );
    }

    // Can create and update assigned tasks
    if (resource === 'tasks' && (action === 'update' || action === 'create')) {
      return true;
    }

    // Can create documents
    if (resource === 'documents' && action === 'create') {
      return true;
    }
  }

  return false;
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: UserRole | string | undefined): boolean {
  return userRole === 'admin';
}

/**
 * Check if user can manage teams (admin or manager)
 */
export function canManageTeam(userRole: UserRole | string | undefined): boolean {
  return userRole === 'admin' || userRole === 'manager';
}

/**
 * Check if user can create projects
 */
export function canCreateProject(userRole: UserRole | string | undefined): boolean {
  return hasPermission(userRole as UserRole, 'projects', 'create');
}

/**
 * Check if user can create tasks
 */
export function canCreateTask(userRole: UserRole | string | undefined): boolean {
  return hasPermission(userRole as UserRole, 'tasks', 'create');
}

/**
 * Check if user can delete items
 */
export function canDelete(
  userRole: UserRole | string | undefined,
  resource: string
): boolean {
  return hasPermission(userRole as UserRole, resource, 'delete');
}

/**
 * Check if user can access user management
 */
export function canManageUsers(userRole: UserRole | string | undefined): boolean {
  return isAdmin(userRole);
}

/**
 * Hook for conditional UI rendering based on permissions
 */
export function usePermission(resource: string, action: Permission['action']) {
  // This would integrate with your auth context
  // For now, returns a simple helper
  return {
    hasPermission: (userRole: UserRole | string | undefined) =>
      hasPermission(userRole, resource, action),
  };
}

/**
 * Get role display name
 */
export function getRoleLabel(role: UserRole | string): string {
  switch (role) {
    case 'admin':
      return 'Administrateur';
    case 'manager':
      return 'Chef de Projet';
    case 'user':
      return 'Employé';
    default:
      return role;
  }
}

/**
 * Get role badge color class
 */
export function getRoleBadgeClass(role: UserRole | string): string {
  switch (role) {
    case 'admin':
    case 'ADMIN':
      return 'bg-purple-100 text-purple-800';
    case 'manager':
    case 'PROJECT_MANAGER':
      return 'bg-blue-100 text-blue-800';
    case 'user':
    case 'EMPLOYEE':
      return 'bg-green-100 text-green-800';
    case 'VIEWER':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Mapper le rôle de la base de données vers le rôle applicatif
 */
export function mapRole(dbRole: string | null | undefined): UserRole {
  if (!dbRole) return 'user';

  const normalized = dbRole.toUpperCase();

  switch (normalized) {
    case 'ADMIN':
      return 'admin';
    case 'PROJECT_MANAGER':
      return 'manager';
    case 'EMPLOYEE':
      return 'user';
    case 'VIEWER':
      return 'user'; // Viewer est traité comme user avec permissions limitées
    default:
      return 'user';
  }
}

// Définir les routes protégées et les rôles autorisés
export interface RouteAccess {
  path: string;
  allowedRoles: UserRole[];
  exact?: boolean;
}

const routeAccessList: RouteAccess[] = [
  // Dashboard principal - tous
  { path: '/dashboard', allowedRoles: ['admin', 'manager', 'user'], exact: true },

  // Projets - tous
  { path: '/dashboard/projects', allowedRoles: ['admin', 'manager', 'user'] },

  // Tâches - tous
  { path: '/dashboard/tasks', allowedRoles: ['admin', 'manager', 'user'] },

  // Étapes - tous (mais employés en lecture seule)
  { path: '/dashboard/stages', allowedRoles: ['admin', 'manager', 'user'] },

  // Utilisateurs - admin et manager seulement
  { path: '/dashboard/users', allowedRoles: ['admin', 'manager'] },

  // Activity logs - tous
  { path: '/dashboard/activity-logs', allowedRoles: ['admin', 'manager', 'user'] },

  // Reports - admin et manager seulement
  { path: '/dashboard/reports', allowedRoles: ['admin', 'manager'] },

  // Settings - tous
  { path: '/dashboard/settings', allowedRoles: ['admin', 'manager', 'user'] },
];

/**
 * Vérifier si un utilisateur peut accéder à une route
 */
export function canAccessRoute(
  userRole: UserRole | string | undefined,
  pathname: string
): boolean {
  if (!userRole) return false;

  // Admin peut tout accéder
  if (userRole === 'admin') return true;

  // Mapper le rôle si nécessaire
  const mappedRole = mapRole(userRole);

  // Trouver la route correspondante
  const route = routeAccessList.find((r) => {
    if (r.exact) {
      return pathname === r.path;
    }
    return pathname.startsWith(r.path);
  });

  // Si la route n'est pas définie dans la liste, autoriser par défaut
  if (!route) return true;

  return route.allowedRoles.includes(mappedRole);
}

/**
 * Obtenir les routes accessibles pour un rôle
 */
export function getAccessibleRoutes(userRole: UserRole | string | undefined): RouteAccess[] {
  if (!userRole) return [];

  const mappedRole = mapRole(userRole);

  return routeAccessList.filter((route) =>
    route.allowedRoles.includes(mappedRole)
  );
}
