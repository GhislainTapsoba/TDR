/**
* Role-Based Access Control (RBAC) System using database
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { db } from './db';
// Cache for permissions
var permissionsCache = [];
var rolePermissionsCache = new Map();
var lastCacheUpdate = 0;
var CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
/**
 * Load permissions from database
 */
function loadPermissionsFromDB() {
    return __awaiter(this, void 0, void 0, function () {
        var query, rows, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    query = 'SELECT id, name, description, resource, action FROM permissions';
                    return [4 /*yield*/, db.query(query)];
                case 1:
                    rows = (_a.sent()).rows;
                    return [2 /*return*/, rows.map(function (row) { return ({
                            id: row.id,
                            name: row.name,
                            description: row.description,
                            resource: row.resource,
                            action: row.action,
                        }); })];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error loading permissions from DB:', error_1);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Load role permissions from database
 */
function loadRolePermissionsFromDB() {
    return __awaiter(this, void 0, void 0, function () {
        var query, rows, rolePermissions_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    query = "\n      SELECT r.name as role_name, p.id, p.name, p.description, p.resource, p.action\n      FROM role_permissions rp\n      JOIN roles r ON rp.role_id = r.id\n      JOIN permissions p ON rp.permission_id = p.id\n    ";
                    return [4 /*yield*/, db.query(query)];
                case 1:
                    rows = (_a.sent()).rows;
                    rolePermissions_1 = new Map();
                    rows.forEach(function (row) {
                        var roleName = row.role_name;
                        var permission = {
                            id: row.id,
                            name: row.name,
                            description: row.description,
                            resource: row.resource,
                            action: row.action,
                        };
                        if (!rolePermissions_1.has(roleName)) {
                            rolePermissions_1.set(roleName, []);
                        }
                        rolePermissions_1.get(roleName).push(permission);
                    });
                    return [2 /*return*/, rolePermissions_1];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error loading role permissions from DB:', error_2);
                    return [2 /*return*/, new Map()];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get permissions for a role, using cache or loading from DB
 */
function getRolePermissionsFromDB(roleName) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, loadPermissionsFromDB()];
                case 1:
                    // TEMPORARILY bypass cache for validation
                    permissionsCache = _a.sent();
                    return [4 /*yield*/, loadRolePermissionsFromDB()];
                case 2:
                    rolePermissionsCache = _a.sent();
                    lastCacheUpdate = Date.now(); // Update timestamp to prevent immediate re-load if cache is used again
                    return [2 /*return*/, rolePermissionsCache.get(roleName) || []];
            }
        });
    });
}
/**
 * Check if a user has permission to perform an action on a resource
 */
export function hasPermission(userRole, resource, action) {
    return __awaiter(this, void 0, void 0, function () {
        var permissions, hasWildcard;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getRolePermissionsFromDB(userRole)];
                case 1:
                    permissions = _a.sent();
                    // TEMPORARY DEBUG LOG
                    console.log({
                        role: userRole,
                        resource: resource,
                        action: action,
                        permissions: permissions
                    });
                    hasWildcard = permissions.some(function (p) { return p.resource === '*' && (p.action === 'manage' || p.action === action); });
                    if (hasWildcard) {
                        return [2 /*return*/, true];
                    }
                    // Check for specific permission
                    return [2 /*return*/, permissions.some(function (p) { return p.resource === resource && (p.action === 'manage' || p.action === action); })];
            }
        });
    });
}
/**
 * Require permission middleware helper
 * Returns error response if user doesn't have permission
 */
export function requirePermission(userRole, resource, action) {
    return __awaiter(this, void 0, void 0, function () {
        var allowed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, hasPermission(userRole, resource, action)];
                case 1:
                    allowed = _a.sent();
                    if (!allowed) {
                        return [2 /*return*/, {
                                allowed: false,
                                error: "Permission denied: ".concat(userRole, " cannot ").concat(action, " ").concat(resource),
                            }];
                    }
                    return [2 /*return*/, { allowed: true }];
            }
        });
    });
}
/**
 * Check if user can manage a specific project (is project manager or admin)
 */
export function canManageProject(userRole, userId, projectManagerId) {
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
export function canEditTask(userRole, userId, taskAssigneeId, projectManagerId) {
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
export function getRolePermissions(userRole) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getRolePermissionsFromDB(userRole)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * Mapper le rôle stocké en base (ADMIN / PROJECT_MANAGER / EMPLOYEE)
 * vers le rôle applicatif du système de permissions
 */
export function mapDbRoleToUserRole(dbRole) {
    // TEMPORARY DEBUG LOG
    console.log('DB ROLE:', dbRole);
    var role = dbRole === null || dbRole === void 0 ? void 0 : dbRole.toUpperCase();
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
export function isAdmin(userRole) {
    return userRole === 'admin';
}
/**
 * Check if role can manage teams (admin or manager)
 */
export function canManageTeam(userRole) {
    return userRole === 'admin' || userRole === 'manager';
}
/**
 * Check if user has a specific permission
 */
export function hasUserPermission(userPermissions, permission) {
    return userPermissions.includes(permission);
}
/**
 * Initialize default permissions and role assignments
 * This should be called during application startup or via a migration
 */
export function initializePermissions() {
    return __awaiter(this, void 0, void 0, function () {
        var defaultPermissions, existingPermissionsRows, existingPermissionNames, _i, defaultPermissions_1, perm, roles, adminRole, managerRole, employeRole, permissions, _a, permissions_1, perm, managerAssignments, _b, managerAssignments_1, perm, employeAssignments, _c, employeAssignments_1, perm, error_3;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 26, , 27]);
                    defaultPermissions = [
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
                    return [4 /*yield*/, db.query('SELECT name FROM permissions')];
                case 1:
                    existingPermissionsRows = (_d.sent()).rows;
                    existingPermissionNames = new Set(existingPermissionsRows.map(function (row) { return row.name; }));
                    _i = 0, defaultPermissions_1 = defaultPermissions;
                    _d.label = 2;
                case 2:
                    if (!(_i < defaultPermissions_1.length)) return [3 /*break*/, 5];
                    perm = defaultPermissions_1[_i];
                    if (!!existingPermissionNames.has(perm.name)) return [3 /*break*/, 4];
                    return [4 /*yield*/, db.query('INSERT INTO permissions (name, description, resource, action) VALUES ($1, $2, $3, $4)', [perm.name, perm.description, perm.resource, perm.action])];
                case 3:
                    _d.sent();
                    console.log("Added missing permission: ".concat(perm.name));
                    _d.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [4 /*yield*/, db.query('SELECT id, name FROM roles')];
                case 6:
                    roles = (_d.sent()).rows;
                    adminRole = roles.find(function (r) { return r.name === 'admin'; });
                    managerRole = roles.find(function (r) { return r.name === 'manager'; });
                    employeRole = roles.find(function (r) { return r.name === 'employe'; });
                    return [4 /*yield*/, db.query('SELECT id, name, resource, action FROM permissions')];
                case 7:
                    permissions = (_d.sent()).rows;
                    if (!adminRole) return [3 /*break*/, 13];
                    // Clear existing admin role permissions
                    return [4 /*yield*/, db.query('DELETE FROM role_permissions WHERE role_id = $1', [adminRole.id])];
                case 8:
                    // Clear existing admin role permissions
                    _d.sent();
                    _a = 0, permissions_1 = permissions;
                    _d.label = 9;
                case 9:
                    if (!(_a < permissions_1.length)) return [3 /*break*/, 12];
                    perm = permissions_1[_a];
                    return [4 /*yield*/, db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [adminRole.id, perm.id])];
                case 10:
                    _d.sent();
                    _d.label = 11;
                case 11:
                    _a++;
                    return [3 /*break*/, 9];
                case 12:
                    console.log('Admin role permissions re-assigned.');
                    _d.label = 13;
                case 13:
                    if (!managerRole) return [3 /*break*/, 19];
                    // Clear existing manager role permissions
                    return [4 /*yield*/, db.query('DELETE FROM role_permissions WHERE role_id = $1', [managerRole.id])];
                case 14:
                    // Clear existing manager role permissions
                    _d.sent();
                    managerAssignments = permissions.filter(function (p) {
                        return ['projects', 'tasks', 'stages', 'documents', 'activity-logs', 'dashboard'].includes(p.resource) ||
                            p.name === 'users.read';
                    });
                    _b = 0, managerAssignments_1 = managerAssignments;
                    _d.label = 15;
                case 15:
                    if (!(_b < managerAssignments_1.length)) return [3 /*break*/, 18];
                    perm = managerAssignments_1[_b];
                    return [4 /*yield*/, db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [managerRole.id, perm.id])];
                case 16:
                    _d.sent();
                    _d.label = 17;
                case 17:
                    _b++;
                    return [3 /*break*/, 15];
                case 18:
                    console.log('Manager role permissions re-assigned.');
                    _d.label = 19;
                case 19:
                    if (!employeRole) return [3 /*break*/, 25];
                    // Clear existing employe role permissions
                    return [4 /*yield*/, db.query('DELETE FROM role_permissions WHERE role_id = $1', [employeRole.id])];
                case 20:
                    // Clear existing employe role permissions
                    _d.sent();
                    employeAssignments = permissions.filter(function (p) {
                        return (['tasks', 'stages', 'documents'].includes(p.resource) && ['create', 'read', 'update'].includes(p.action)) ||
                            (p.resource === 'projects' && p.action === 'read') ||
                            p.resource === 'activity-logs' ||
                            p.resource === 'dashboard';
                    });
                    _c = 0, employeAssignments_1 = employeAssignments;
                    _d.label = 21;
                case 21:
                    if (!(_c < employeAssignments_1.length)) return [3 /*break*/, 24];
                    perm = employeAssignments_1[_c];
                    return [4 /*yield*/, db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [employeRole.id, perm.id])];
                case 22:
                    _d.sent();
                    _d.label = 23;
                case 23:
                    _c++;
                    return [3 /*break*/, 21];
                case 24:
                    console.log('Employe role permissions re-assigned.');
                    _d.label = 25;
                case 25:
                    console.log('Permissions initialized successfully!');
                    // Force cache refresh after init
                    permissionsCache = [];
                    rolePermissionsCache.clear();
                    lastCacheUpdate = 0;
                    return [3 /*break*/, 27];
                case 26:
                    error_3 = _d.sent();
                    console.error('Error initializing permissions:', error_3);
                    return [3 /*break*/, 27];
                case 27: return [2 /*return*/];
            }
        });
    });
}
