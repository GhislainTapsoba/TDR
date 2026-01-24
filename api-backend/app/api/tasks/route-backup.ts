import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { createConfirmationToken } from '@/lib/emailConfirmation';
import { mapDbRoleToUserRole, requirePermission, canManageProject } from '@/lib/permissions';
import { sendActionNotification } from '@/lib/notificationService';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/tasks - Récupérer toutes les tâches (filtrées par assignation)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role);
    const perm = await requirePermission(userRole, 'tasks', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const project_id = searchParams.get('project_id');

    let queryText: string;
    const queryParams: any[] = [];
    let paramIndex = 1;

    const baseQuery = `
      SELECT t.*,
             CASE
               WHEN t.status = 'TODO' THEN 'a_faire'
               WHEN t.status = 'IN_PROGRESS' THEN 'en_cours'
               WHEN t.status = 'COMPLETED' THEN 'termine'
               WHEN t.status = 'REFUSED' THEN 'refuse'
               ELSE t.status
             END as status,
             c.name as created_by_name,
             p.id as project_id, p.title as project_title,
             s.id as stage_id, s.name as stage_name,
             (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
              FROM task_assignees ta
              JOIN users u ON ta.user_id = u.id
              WHERE ta.task_id = t.id) as assignees
      FROM tasks t
      LEFT JOIN users c ON t.created_by_id = c.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN stages s ON t.stage_id = s.id
    `;
    const whereClauses: string[] = [];

    if (userRole === 'admin') {
      if (status) {
        whereClauses.push(`t.status = $${paramIndex++}`);
        queryParams.push(status);
      }
      if (project_id) {
        whereClauses.push(`t.project_id = $${paramIndex++}`);
        queryParams.push(project_id);
      }
    } else {
      const { rows: projectMembers } = await db.query('SELECT project_id FROM project_members WHERE user_id = $1', [user.id]);
      const memberProjectIds = projectMembers.map(pm => pm.project_id);

      const { rows: managedProjects } = await db.query('SELECT id FROM projects WHERE manager_id = $1 OR created_by_id = $1', [user.id]);
      const managedProjectIds = managedProjects.map(p => p.id);

      const accessibleProjectIds = [...new Set([...memberProjectIds, ...managedProjectIds])];

      let accessControlClause = `EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $${paramIndex++})`;
      queryParams.push(user.id);

      // Also include tasks where user is the direct assignee
      accessControlClause += ` OR t.assigned_to_id = $${paramIndex++}`;
      queryParams.push(user.id);

      if (accessibleProjectIds.length > 0) {
        accessControlClause += ` OR t.project_id = ANY($${paramIndex++})`;
        queryParams.push(accessibleProjectIds);
      }
      whereClauses.push(`(${accessControlClause})`);

      if (status) {
        whereClauses.push(`t.status = $${paramIndex++}`);
        queryParams.push(status);
      }
      if (project_id) {
        whereClauses.push(`t.project_id = $${paramIndex++}`);
        queryParams.push(project_id);
      }
    }

    queryText = baseQuery + (whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '');
    queryText += ' ORDER BY t.created_at DESC';

    const { rows: tasks } = await db.query(queryText, queryParams);

    const transformedTasks = tasks.map(task => ({
      ...task,
      project: task.project_id ? { id: task.project_id, title: task.project_title } : null,
      stage: task.stage_id ? { id: task.stage_id, name: task.stage_name } : null,
    }));

    return corsResponse(transformedTasks || [], request);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}
