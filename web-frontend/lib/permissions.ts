/**
 * Frontend Permission-Based Access Control System
 */

/**
 * Check if user has a specific permission
 */
export function hasPermission(userPermissions: string[], permission: string): boolean {
  return userPermissions.includes(permission);
}

/**
 * Check if user can assign tasks
 */
export function canAssignTasks(userPermissions: string[]): boolean {
  return hasPermission(userPermissions, 'tasks.assign');
}

/**
 * Check if user can manage users
 */
export function canManageUsers(userPermissions: string[]): boolean {
  return hasPermission(userPermissions, 'users.update') || hasPermission(userPermissions, 'users.delete');
}

/**
 * Check if user can create projects
 */
export function canCreateProject(userPermissions: string[]): boolean {
  return hasPermission(userPermissions, 'projects.create');
}

/**
 * Check if user can create tasks
 */
export function canCreateTask(userPermissions: string[]): boolean {
  return hasPermission(userPermissions, 'tasks.create');
}

/**
 * Check if user can delete items
 */
export function canDelete(userPermissions: string[], resource: string): boolean {
  return hasPermission(userPermissions, `${resource}.delete`);
}

/**
 * Hook for conditional UI rendering based on permissions
 */
export function usePermission(permission: string) {
  // This would integrate with your auth context
  // For now, returns a simple helper
  return {
    hasPermission: (userPermissions: string[]) =>
      hasPermission(userPermissions, permission),
  };
}

export function canAccessRoute(role: string, pathname: string): boolean {
  // TODO: Implement actual route access logic based on role and pathname
  return true;
}

export function mapRole(role: string): string[] {
  switch (role.toLowerCase()) {
    case 'admin':
      // Admins can do anything
      return ['projects.create', 'projects.update', 'projects.delete', 'tasks.create', 'tasks.assign', 'users.update', 'users.delete', 'stages.create', 'stages.update', 'stages.delete'];
    case 'manager':
      return ['projects.create', 'projects.update', 'tasks.create', 'tasks.assign', 'stages.create', 'stages.update'];
    case 'user':
      return ['tasks.update']; // e.g. update status of their own tasks
    default:
      return [];
  }
}
